import { useState } from "react";
import {
  Download,
  CheckCircle2,
  Monitor,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

// VBS 런처 스크립트: 커스텀 프로토콜 URL에서 id/pw를 파싱하여 IE 자동 로그인 (Final Version)
const LAUNCHER_VBS = [
  "' Scanner - IE Auto Login Launcher (Final Version)",
  "On Error Resume Next",
  "",
  "Dim url, id, pw",
  "If WScript.Arguments.Count = 0 Then WScript.Quit",
  "url = WScript.Arguments(0)",
  "",
  "' 1. 파라미터 파싱 (ID, PW 추출)",
  "Dim queryStr, params, i, kv",
  'If InStr(url, "?") > 0 Then',
  '    queryStr = Mid(url, InStr(url, "?") + 1)',
  '    If Right(queryStr, 1) = "/" Then queryStr = Left(queryStr, Len(queryStr) - 1)',
  '    params = Split(queryStr, "&")',
  "    For i = 0 To UBound(params)",
  '        kv = Split(params(i), "=")',
  "        If UBound(kv) >= 1 Then",
  '            If LCase(kv(0)) = "id" Then id = kv(1)',
  '            If LCase(kv(0)) = "pw" Then pw = kv(1)',
  "        End If",
  "    Next",
  "End If",
  "",
  "' URL Decode (간이)",
  "Function Decode(s)",
  '    s = Replace(s, "%3D", "=")',
  '    s = Replace(s, "%2B", "+")',
  "    Decode = s",
  "End Function",
  "id = Decode(id)",
  "pw = Decode(pw)",
  "",
  "' 2. IE 객체 생성 및 페이지 이동",
  "Dim IE",
  'Set IE = CreateObject("InternetExplorer.Application")',
  "IE.Visible = True",
  'IE.Navigate "http://iscan.kyobobook.co.kr/kbb/intro"',
  "",
  "' 3. 창 재연결 및 폼 찾기 (최대 20초 대기)",
  "Dim ShellApp, ShellWindows, win, objUser",
  "Dim maxWait, waitCount, found",
  "maxWait = 40",
  "waitCount = 0",
  "found = False",
  "",
  "Do While waitCount < maxWait",
  "    ' 끊어진 창 재연결 시도",
  '    Set ShellApp = CreateObject("Shell.Application")',
  "    Set ShellWindows = ShellApp.Windows()",
  "    For Each win In ShellWindows",
  '        If InStr(LCase(win.FullName), "iexplore.exe") > 0 Then',
  '            If InStr(LCase(win.LocationURL), "kyobobook") > 0 Then',
  "                Set IE = win",
  "                Exit For",
  "            End If",
  "        End If",
  "    Next",
  "",
  "    ' 로그인 폼(username) 확인",
  "    Set objUser = Nothing",
  '    Set objUser = IE.Document.getElementById("username")',
  "",
  "    If Not objUser Is Nothing Then",
  "        found = True",
  "        Exit Do",
  "    End If",
  "",
  "    waitCount = waitCount + 1",
  "    WScript.Sleep 500",
  "Loop",
  "",
  "' 4. 로그인 수행",
  "If found Then",
  '    IE.Document.getElementById("username").Value = id',
  '    IE.Document.getElementById("password").Value = pw',
  "    WScript.Sleep 200",
  '    IE.Document.getElementById("authUser").Click',
  "End If",
  "",
  "Set IE = Nothing",
  "Set ShellApp = Nothing",
].join("\r\n");

// REG 파일: 프로토콜 핸들러 레지스트리 등록
const KYOBOSCAN_REG = [
  "Windows Registry Editor Version 5.00",
  "",
  "[HKEY_CURRENT_USER\\Software\\Classes\\kyoboscan]",
  '@="URL:Scanner Protocol"',
  '"URL Protocol"=""',
  "",
  "[HKEY_CURRENT_USER\\Software\\Classes\\kyoboscan\\shell]",
  "",
  "[HKEY_CURRENT_USER\\Software\\Classes\\kyoboscan\\shell\\open]",
  "",
  "[HKEY_CURRENT_USER\\Software\\Classes\\kyoboscan\\shell\\open\\command]",
  '@="wscript \\"C:\\\\ScanKBB\\\\ie-launcher.vbs\\" \\"%1\\""',
].join("\r\n");

// 설치 BAT 스크립트 (영문 전용 - 인코딩 문제 방지)
const INSTALL_BAT = [
  "@echo off",
  "echo ============================================",
  "echo  Scanner - Protocol Handler Install",
  "echo ============================================",
  "echo.",
  "",
  "mkdir C:\\ScanKBB 2>nul",
  'copy /Y "%~dp0ie-launcher.vbs" C:\\ScanKBB\\ie-launcher.vbs >nul',
  "echo [OK] ie-launcher.vbs copied to C:\\ScanKBB",
  "",
  'regedit /s "%~dp0scanner.reg"',
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
  "echo  Scanner - Protocol Handler Uninstall",
  "echo ============================================",
  "echo.",
  "",
  "reg delete HKCU\\Software\\Classes\\kyoboscan /f >nul 2>&1",
  "echo [OK] kyoboscan:// protocol removed",
  "",
  "del /Q C:\\ScanKBB\\ie-launcher.vbs 2>nul",
  "echo [OK] ie-launcher.vbs deleted",
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
      zip.file("ie-launcher.vbs", LAUNCHER_VBS);
      zip.file("uninstall.bat", UNINSTALL_BAT);
      zip.file("scanner.reg", KYOBOSCAN_REG);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ie-setup.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloaded(true);
      toast.success("ie-setup.zip 다운로드 완료!");
    } catch (err) {
      toast.error("ZIP 생성 중 오류가 발생했습니다");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 다운로드 영역 */}
      <div className="flex flex-col items-center gap-3 py-5">
        <div className="w-14 h-14 rounded-xl bg-[#E8F5E9] border-2 border-[#3CB043] flex items-center justify-center">
          <Package size={28} className="text-[#3CB043]" />
        </div>

        <div className="text-center">
          <h3 className="text-sm text-[#0A2463] mb-0.5">
            초기 설정 패키지 (최초 1회)
          </h3>
          <p className="text-xs text-[#888]">
            설치 후 버튼 클릭만으로 IE 자동 실행
          </p>
        </div>

        <button
          onClick={handleDownloadSetup}
          disabled={isDownloading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-all ${
            downloaded
              ? "bg-[#3CB043] hover:bg-[#34A03B] text-white shadow-md"
              : "bg-[#0A2463] hover:bg-[#081D50] text-white shadow-md hover:shadow-lg"
          } ${isDownloading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {isDownloading ? (
            <>생성 중...</>
          ) : downloaded ? (
            <>
              <CheckCircle2 size={16} />
              다시 다운로드
            </>
          ) : (
            <>
              <Download size={16} />
              ie-setup.zip 다운로드
            </>
          )}
        </button>
      </div>

      {/* 설치 가이드 */}
      <div className="bg-[#F0F4FA] border border-[#B8C9E0] rounded-xl p-4 text-sm text-[#333]">
        <h3 className="text-sm mb-3 flex items-center gap-2 text-[#0A2463]">
          <Monitor size={15} className="text-[#0068B7]" />
          설치 방법 (최초 1회)
        </h3>
        <ol className="list-decimal list-inside space-y-2.5 ml-1 text-sm text-[#444]">
          <li>
            위 버튼으로{" "}
            <code className="bg-[#D1D1D1]/50 text-[#0A2463] px-1.5 py-0.5 rounded font-mono text-xs">
              ie-setup.zip
            </code>
            을 다운로드합니다.
          </li>
          <li>
            ZIP 파일을 <strong className="text-[#0A2463]">압축 해제</strong>합니다.
          </li>
          <li>
            <code className="bg-[#D1D1D1]/50 text-[#0A2463] px-1.5 py-0.5 rounded font-mono text-xs">
              install.bat
            </code>
            를 <strong className="text-[#0A2463]">더블클릭</strong>하여 실행합니다.
          </li>
          <li>
            설치 완료! 이후 우측{" "}
            <strong className="text-[#0068B7]">[IE 자동 로그인 실행]</strong> 버튼만 클릭하면 됩니다.
          </li>
        </ol>

        {/* ActiveX 안내 */}
        <div className="mt-4 bg-[#FFF5F5] border-2 border-[#DC3545] rounded-lg px-4 py-3">
          <p className="text-[#8B0000] text-sm"><strong>※</strong> IE 모드 로그인 시 <strong>ActiveX 알림창</strong>이 뜨면, 해당 ActiveX를 <strong>설치</strong>해 주시기 바랍니다. <br /><span className="text-[#DC3545]">(거래명세서 이미지 시스템 설치파일입니다.)</span></p>
        </div>
      </div>

      {/* 포함 파일 목록 */}
      <div className="border border-[#D1D1D1] rounded-xl divide-y divide-[#E8E8E8] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-[#F8F9FB] transition-colors">
          <div className="w-7 h-7 rounded-md bg-[#E8F5E9] border border-[#3CB043] flex items-center justify-center text-[#3CB043] text-[10px] font-mono font-bold">
            BAT
          </div>
          <div className="flex-1">
            <p className="text-sm text-[#222]">install.bat</p>
            <p className="text-[11px] text-[#999]">
              프로토콜 핸들러 등록 + VBS 복사
            </p>
          </div>
          <CheckCircle2 size={14} className="text-[#3CB043]" />
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-[#F8F9FB] transition-colors">
          <div className="w-7 h-7 rounded-md bg-[#E3F2FD] border border-[#0068B7] flex items-center justify-center text-[#0068B7] text-[10px] font-mono font-bold">
            VBS
          </div>
          <div className="flex-1">
            <p className="text-sm text-[#222]">
              ie-launcher.vbs
            </p>
            <p className="text-[11px] text-[#999]">
              IE 자동 실행 + 로그인 스크립트
            </p>
          </div>
          <CheckCircle2 size={14} className="text-[#3CB043]" />
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-[#F8F9FB] transition-colors">
          <div className="w-7 h-7 rounded-md bg-[#E8EAF6] border border-[#0A2463] flex items-center justify-center text-[#0A2463] text-[10px] font-mono font-bold">
            REG
          </div>
          <div className="flex-1">
            <p className="text-sm text-[#222]">scanner.reg</p>
            <p className="text-[11px] text-[#999]">
              프로토콜 레지스트리 등록 파일
            </p>
          </div>
          <CheckCircle2 size={14} className="text-[#3CB043]" />
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-[#F8F9FB] transition-colors">
          <div className="w-7 h-7 rounded-md bg-[#FFF5F5] border border-[#DC3545] flex items-center justify-center text-[#DC3545] text-[10px] font-mono font-bold">
            BAT
          </div>
          <div className="flex-1">
            <p className="text-sm text-[#222]">uninstall.bat</p>
            <p className="text-[11px] text-[#999]">
              프로토콜 핸들러 제거 (필요 시)
            </p>
          </div>
          <CheckCircle2 size={14} className="text-[#3CB043]" />
        </div>
      </div>
    </div>
  );
}