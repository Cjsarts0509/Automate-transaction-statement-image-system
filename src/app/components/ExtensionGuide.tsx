import { useState } from "react";
import {
  Download,
  CheckCircle2,
  Monitor,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

// VBS 런처 스크립트: 커스텀 프로토콜 URL에서 id/pw를 파싱하여 IE 자동 로그인
const LAUNCHER_VBS = [
  "' Kyobo Scanner - IE Auto Login Launcher",
  "' Called via kyoboscan:// protocol handler",
  "",
  "On Error Resume Next",
  "",
  "Dim url, id, pw",
  "",
  "url = WScript.Arguments(0)",
  "",
  "Dim queryStr",
  'If InStr(url, "?") > 0 Then',
  '    queryStr = Mid(url, InStr(url, "?") + 1)',
  '    If Right(queryStr, 1) = "/" Then queryStr = Left(queryStr, Len(queryStr) - 1)',
  "",
  "    Dim params, i",
  '    params = Split(queryStr, "&")',
  "    For i = 0 To UBound(params)",
  "        Dim kv",
  '        kv = Split(params(i), "=")',
  "        If UBound(kv) >= 1 Then",
  '            If LCase(kv(0)) = "id" Then id = kv(1)',
  '            If LCase(kv(0)) = "pw" Then pw = kv(1)',
  "        End If",
  "    Next",
  "End If",
  "",
  "Function URLDecode(s)",
  "    Dim result, j",
  '    result = ""',
  "    j = 1",
  "    Do While j <= Len(s)",
  '        If Mid(s, j, 1) = "%" And j + 2 <= Len(s) Then',
  '            result = result & Chr(CInt("&H" & Mid(s, j + 1, 2)))',
  "            j = j + 3",
  '        ElseIf Mid(s, j, 1) = "+" Then',
  '            result = result & " "',
  "            j = j + 1",
  "        Else",
  "            result = result & Mid(s, j, 1)",
  "            j = j + 1",
  "        End If",
  "    Loop",
  "    URLDecode = result",
  "End Function",
  "",
  "id = URLDecode(id)",
  "pw = URLDecode(pw)",
  "",
  'If id = "" Or pw = "" Then',
  '    MsgBox "ID or Password not provided.", vbExclamation, "Error"',
  "    WScript.Quit",
  "End If",
  "",
  "Dim IE",
  'Set IE = CreateObject("InternetExplorer.Application")',
  "IE.Visible = True",
  'IE.Navigate "http://iscan.kyobobook.co.kr/kbb/intro"',
  "",
  "Do While IE.Busy Or IE.ReadyState <> 4",
  "    WScript.Sleep 500",
  "Loop",
  "",
  "WScript.Sleep 2000",
  "",
  'IE.Document.getElementById("username").Value = id',
  'IE.Document.getElementById("password").Value = pw',
  'IE.Document.getElementById("authUser").Click',
  "",
  "If Err.Number <> 0 Then",
  '    MsgBox "Auto login failed: " & Err.Description, vbExclamation, "Error"',
  "    Err.Clear",
  "End If",
  "",
  "On Error GoTo 0",
  "Set IE = Nothing",
].join("\r\n");

// REG 파일: 프로토콜 핸들러 레지스트리 등록
const KYOBOSCAN_REG = [
  "Windows Registry Editor Version 5.00",
  "",
  "[HKEY_CURRENT_USER\\Software\\Classes\\kyoboscan]",
  '@="URL:Kyobo Scanner Protocol"',
  '"URL Protocol"=""',
  "",
  "[HKEY_CURRENT_USER\\Software\\Classes\\kyoboscan\\shell]",
  "",
  "[HKEY_CURRENT_USER\\Software\\Classes\\kyoboscan\\shell\\open]",
  "",
  "[HKEY_CURRENT_USER\\Software\\Classes\\kyoboscan\\shell\\open\\command]",
  '@="wscript \\"C:\\\\ScanKBB\\\\kyobo-launcher.vbs\\" \\"%1\\""',
].join("\r\n");

// 설치 BAT 스크립트 (영문 전용 - 인코딩 문제 방지)
const INSTALL_BAT = [
  "@echo off",
  "echo ============================================",
  "echo  Kyobo Scanner - Protocol Handler Install",
  "echo ============================================",
  "echo.",
  "",
  "mkdir C:\\ScanKBB 2>nul",
  'copy /Y "%~dp0kyobo-launcher.vbs" C:\\ScanKBB\\kyobo-launcher.vbs >nul',
  "echo [OK] kyobo-launcher.vbs copied to C:\\ScanKBB",
  "",
  'regedit /s "%~dp0kyoboscan.reg"',
  "echo [OK] kyoboscan:// protocol registered",
  "",
  "echo.",
  "echo ============================================",
  "echo  Install complete!",
  "echo  Now click [IE Auto Login] on the web app.",
  "echo ============================================",
  "echo.",
  "pause",
].join("\r\n");

// 제거 BAT 스크립트 (영문 전용)
const UNINSTALL_BAT = [
  "@echo off",
  "echo ============================================",
  "echo  Kyobo Scanner - Protocol Handler Uninstall",
  "echo ============================================",
  "echo.",
  "",
  "reg delete HKCU\\Software\\Classes\\kyoboscan /f >nul 2>&1",
  "echo [OK] kyoboscan:// protocol removed",
  "",
  "del /Q C:\\ScanKBB\\kyobo-launcher.vbs 2>nul",
  "echo [OK] kyobo-launcher.vbs deleted",
  "",
  "echo.",
  "echo  Uninstall complete!",
  "pause",
].join("\r\n");

export function ExtensionGuide() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownloadSetup = async () => {
    setIsDownloading(true);

    try {
      const zip = new JSZip();
      zip.file("install.bat", INSTALL_BAT);
      zip.file("kyobo-launcher.vbs", LAUNCHER_VBS);
      zip.file("uninstall.bat", UNINSTALL_BAT);
      zip.file("kyoboscan.reg", KYOBOSCAN_REG);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kyobo-setup.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloaded(true);
      toast.success("kyobo-setup.zip 다운로드 완료!");
    } catch (err) {
      toast.error("ZIP 생성 중 오류가 발생했습니다");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 다운로드 영역 */}
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
          <Settings size={32} className="text-blue-600" />
        </div>

        <div className="text-center">
          <h3 className="font-semibold text-gray-800 mb-1">
            초기 설정 패키지 (최초 1회)
          </h3>
          <p className="text-sm text-gray-500">
            설치 후 버튼 클릭만으로 IE 자동 실행
          </p>
        </div>

        <button
          onClick={handleDownloadSetup}
          disabled={isDownloading}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            downloaded
              ? "bg-green-500 hover:bg-green-600 text-white shadow-md"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
          } ${isDownloading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {isDownloading ? (
            <>생성 중...</>
          ) : downloaded ? (
            <>
              <CheckCircle2 size={18} />
              다시 다운로드
            </>
          ) : (
            <>
              <Download size={18} />
              kyobo-setup.zip 다운로드
            </>
          )}
        </button>
      </div>

      {/* 설치 가이드 */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Monitor size={16} />
          설치 방법 (최초 1회)
        </h3>
        <ol className="list-decimal list-inside space-y-2.5 ml-1">
          <li>
            위 버튼으로{" "}
            <code className="bg-blue-100 px-1 rounded font-mono">
              kyobo-setup.zip
            </code>
            을 다운로드합니다.
          </li>
          <li>
            ZIP 파일을 <strong>압축 해제</strong>합니다.
          </li>
          <li>
            <code className="bg-blue-100 px-1 rounded font-mono">
              install.bat
            </code>
            를 <strong>더블클릭</strong>하여 실행합니다.
          </li>
          <li>
            설치 완료! 이후 좌측{" "}
            <strong>[IE 자동 로그인 실행]</strong> 버튼만 클릭하면 됩니다.
          </li>
        </ol>
      </div>

      {/* 포함 파일 목록 */}
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center text-green-700 text-xs font-mono font-bold">
            BAT
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">install.bat</p>
            <p className="text-xs text-gray-400">
              프로토콜 핸들러 등록 + VBS 복사 (최초 1회 실행)
            </p>
          </div>
          <CheckCircle2 size={16} className="text-green-500" />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-mono font-bold">
            VBS
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">
              kyobo-launcher.vbs
            </p>
            <p className="text-xs text-gray-400">
              IE 자동 실행 + 로그인 스크립트 (프로토콜 핸들러)
            </p>
          </div>
          <CheckCircle2 size={16} className="text-green-500" />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-mono font-bold">
            REG
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">kyoboscan.reg</p>
            <p className="text-xs text-gray-400">
              kyoboscan:// 프로토콜 레지스트리 등록 파일
            </p>
          </div>
          <CheckCircle2 size={16} className="text-green-500" />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center text-red-700 text-xs font-mono font-bold">
            BAT
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">uninstall.bat</p>
            <p className="text-xs text-gray-400">
              프로토콜 핸들러 제거 (필요 시 실행)
            </p>
          </div>
          <CheckCircle2 size={16} className="text-green-500" />
        </div>
      </div>
    </div>
  );
}