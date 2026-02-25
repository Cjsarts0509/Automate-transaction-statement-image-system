import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Play,
  RefreshCcw,
  FileText,
  AlertTriangle,
  Lock,
  User,
  X,
  Archive,
  CheckCircle2,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

interface FileItem {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  type: string;
  file: File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** 이미지 File(JPG/PNG 등) → PNG Blob 변환 */
function imageToPng(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error("Canvas context 생성 실패"));
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error("PNG 변환 실패"));
        },
        "image/png"
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지 로드 실패"));
    };
    img.src = url;
  });
}

/** PDF File → PNG Blob[] 변환 (pdf.js CDN 사용) */
async function pdfToPngs(
  file: File,
  onLog?: (msg: string) => void
): Promise<Blob[]> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  onLog?.(`PDF 페이지 수: ${totalPages}`);

  const blobs: Blob[] = [];
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const scale = 2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PDF→PNG 변환 실패"))),
        "image/png"
      );
    });
    blobs.push(blob);
    onLog?.(`  PDF 페이지 ${i}/${totalPages} → PNG 변환 완료`);
  }
  return blobs;
}

/** pdf.js CDN 동적 로드 (한 번만) */
let _pdfjsPromise: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = new Promise((resolve, reject) => {
    const existing = (window as any).pdfjsLib;
    if (existing) {
      existing.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs";
      return resolve(existing);
    }
    import(
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.min.mjs"
    )
      .then((mod) => {
        const lib = mod.default || mod;
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs";
        (window as any).pdfjsLib = lib;
        resolve(lib);
      })
      .catch(reject);
  });
  return _pdfjsPromise;
}

export function ScannerInterface() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_TYPES = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/pdf",
  ];
  const ACCEPTED_EXT = ".png,.jpg,.jpeg,.pdf";

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogMessages((prev) => [`[${timestamp}] ${msg}`, ...prev]);
  }, []);

  // 단일 파일만 처리
  const processFile = useCallback(
    (file: File) => {
      if (
        !ACCEPTED_TYPES.includes(file.type) &&
        !file.name.match(/\.(png|jpg|jpeg|pdf)$/i)
      ) {
        toast.error(`지원하지 않는 파일 형식: ${file.name}`);
        addLog(`[오류] 지원하지 않는 파일: ${file.name}`);
        return;
      }

      const newFile: FileItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        size: formatFileSize(file.size),
        sizeBytes: file.size,
        type: file.type,
        file,
      };

      setFiles([newFile]); // 항상 1개만 유지
      setIsSaved(false);
      toast.success(`${file.name} 파일이 등록되었습니다`);
      addLog(`파일 등록: ${file.name} (${newFile.size})`);
    },
    [addLog]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length > 1) {
        toast.warning("파일은 1개만 업로드할 수 있습니다. 첫 번째 파일만 등록됩니다.");
      }
      processFile(e.dataTransfer.files[0]);
    }
  };

  const removeFile = () => {
    if (files.length > 0) {
      addLog(`파일 제거: ${files[0].name}`);
    }
    setFiles([]);
    setIsSaved(false);
  };

  const handleReset = () => {
    setEmployeeId("");
    setPassword("");
    setFiles([]);
    setLogMessages([]);
    setIsSaved(false);
    toast.info("모든 항목이 초기화되었습니다");
  };

  // ── 저장: 파일을 PNG로 변환 → 폴더 선택 → 개별 파일 저장 ──
  const handleSave = async () => {
    if (files.length === 0) {
      toast.error("저장할 파일이 없습니다. 먼저 파일을 업로드하세요.");
      return;
    }

    setIsSaving(true);
    addLog("PNG 변환 시작...");

    try {
      // 1) 모든 파일을 PNG Blob으로 변환
      const pngFiles: { name: string; blob: Blob }[] = [];
      let pngIndex = 1;

      for (let idx = 0; idx < files.length; idx++) {
        const fileItem = files[idx];
        const isPdf =
          fileItem.type === "application/pdf" ||
          fileItem.name.toLowerCase().endsWith(".pdf");
        const isPng =
          fileItem.type === "image/png" ||
          fileItem.name.toLowerCase().endsWith(".png");

        if (isPdf) {
          addLog(`PDF 변환 중: ${fileItem.name}`);
          try {
            const pngBlobs = await pdfToPngs(fileItem.file, addLog);
            for (const blob of pngBlobs) {
              const newName = `scan_${String(pngIndex).padStart(3, "0")}.png`;
              pngFiles.push({ name: newName, blob });
              pngIndex++;
            }
          } catch (pdfErr: any) {
            addLog(`[오류] PDF 변환 실패: ${pdfErr.message}`);
            const newName = `scan_${String(pngIndex).padStart(3, "0")}.pdf`;
            pngFiles.push({ name: newName, blob: fileItem.file });
            pngIndex++;
          }
        } else if (isPng) {
          const newName = `scan_${String(pngIndex).padStart(3, "0")}.png`;
          pngFiles.push({ name: newName, blob: fileItem.file });
          addLog(`변환 완료: ${newName} (원본 PNG: ${fileItem.name})`);
          pngIndex++;
        } else {
          addLog(`PNG 변환 중: ${fileItem.name}`);
          try {
            const pngBlob = await imageToPng(fileItem.file);
            const newName = `scan_${String(pngIndex).padStart(3, "0")}.png`;
            pngFiles.push({ name: newName, blob: pngBlob });
            addLog(`변환 완료: ${newName} (${fileItem.name} → PNG)`);
            pngIndex++;
          } catch (imgErr: any) {
            addLog(`[오류] 이미지 변환 실패: ${imgErr.message}`);
            const ext =
              fileItem.name.split(".").pop()?.toLowerCase() || "jpg";
            const newName = `scan_${String(pngIndex).padStart(3, "0")}.${ext}`;
            pngFiles.push({ name: newName, blob: fileItem.file });
            pngIndex++;
          }
        }
      }

      const totalFiles = pngFiles.length;
      addLog(`총 ${totalFiles}개 PNG 파일 변환 완료`);

      // 2) showDirectoryPicker로 폴더 선택 → 개별 파일 저장
      if (typeof (window as any).showDirectoryPicker === "function") {
        try {
          addLog("저장할 폴더를 선택하세요... (권장: C:\\ScanKBB\\scan)");
          const dirHandle = await (window as any).showDirectoryPicker({
            id: "scan-save-dir",
            mode: "readwrite",
            startIn: "downloads",
          });

          for (const pngFile of pngFiles) {
            const fileHandle = await dirHandle.getFileHandle(pngFile.name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(pngFile.blob);
            await writable.close();
            addLog(`저장 완료: ${pngFile.name}`);
          }

          setIsSaved(true);
          addLog(`폴더 저장 완료! (${totalFiles}개 PNG 파일)`);
          toast.success(`${totalFiles}개 PNG 파일이 폴더에 저장되었습니다!`);
          setIsSaving(false);
          return;
        } catch (pickerErr: any) {
          if (pickerErr.name === "AbortError") {
            addLog("저장이 취소되었습니다.");
            toast.warning("저장이 취소되었습니다.");
            setIsSaving(false);
            return;
          }
          addLog("[안내] 폴더 선택을 사용할 수 없어 ZIP 다운로드로 전환합니다.");
        }
      }

      // 3) 폴백: ZIP 다운로드
      addLog("ZIP 압축 중...");
      const zip = new JSZip();
      for (const pngFile of pngFiles) {
        zip.file(pngFile.name, pngFile.blob);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "scan-files.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsSaved(true);
      addLog(`scan-files.zip 다운로드 완료 (${totalFiles}개 PNG 포함)`);
      toast.success("scan-files.zip 다운로드 완료!");
    } catch (err: any) {
      addLog(`[오류] 파일 저장 실패: ${err.message || err}`);
      toast.error("파일 저장 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  // ── 실행: 커스텀 프로토콜로 IE 자동 로그인 ──
  const handleExecute = () => {
    if (!employeeId || employeeId.length !== 5) {
      toast.error("사번을 5자리로 입력해 주세요");
      return;
    }
    if (!password) {
      toast.error("비밀번호를 입력해 주세요");
      return;
    }

    addLog("IE 모드 자동 로그인 실행...");

    const protocolUrl = `kyoboscan://login?id=${encodeURIComponent(employeeId)}&pw=${encodeURIComponent(password)}`;
    addLog(`프로토콜 호출: kyoboscan://login?id=${employeeId}&pw=****`);

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = protocolUrl;
    document.body.appendChild(iframe);

    const timeout = setTimeout(() => {
      document.body.removeChild(iframe);
      addLog("[안내] 프로토콜이 등록되지 않았습니다. 우측 패널에서 초기 설정을 먼저 진행하세요.");
      toast.error("초기 설정이 필요합니다. 우측 패널의 [설치 패키지 다운로드]를 먼저 실행하세요.", { duration: 5000 });
    }, 3000);

    const onBlur = () => {
      clearTimeout(timeout);
      try { document.body.removeChild(iframe); } catch (_) {}
      addLog("IE 자동 로그인 실행 완료!");
      toast.success("IE가 열리고 자동 로그인됩니다.");
      window.removeEventListener("blur", onBlur);
    };
    window.addEventListener("blur", onBlur);

    setTimeout(() => {
      window.removeEventListener("blur", onBlur);
      try { document.body.removeChild(iframe); } catch (_) {}
    }, 5000);
  };

  const canExecute = employeeId.length === 5 && password.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* ─── 로그인 정보 ─── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm text-blue-800 flex items-center gap-2">
            <User size={15} />
            <span>로그인 정보</span>
            <span className="text-red-500 text-xs">*필수</span>
          </h3>
        </div>
        <div className="p-5">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">사번</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  maxLength={5}
                  placeholder="5자리 사번 입력"
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all placeholder:text-gray-400"
                  value={employeeId}
                  onChange={(e) =>
                    setEmployeeId(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
                {employeeId.length === 5 && (
                  <CheckCircle2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">비밀번호</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="비밀번호 입력"
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all placeholder:text-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {password.length > 0 && (
                  <CheckCircle2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 파일 업로드 (단일 파일) ─── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm text-orange-800 flex items-center gap-2">
            <Upload size={15} />
            <span>파일 업로드</span>
            <span className="text-xs text-gray-400 ml-auto">1개 파일만 가능</span>
          </h3>
        </div>
        <div className="p-5">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXT}
            onChange={handleFileSelect}
            className="hidden"
          />

          {files.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragOver
                  ? "border-blue-500 bg-blue-50 scale-[1.01]"
                  : "border-gray-300 hover:border-orange-400 hover:bg-orange-50/30"
              }`}
            >
              <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                isDragOver ? "bg-blue-100" : "bg-gray-100"
              }`}>
                <ImageIcon
                  size={22}
                  className={isDragOver ? "text-blue-500" : "text-gray-400"}
                />
              </div>
              <p className="text-sm text-gray-600">
                파일을 <strong>드래그 & 드롭</strong>하거나 <strong>클릭</strong>하여 선택
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                PNG, JPG, PDF → 모두 PNG로 변환됩니다
              </p>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-4 py-3 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{files[0].name}</p>
                  <p className="text-xs text-gray-500">
                    {files[0].size} · <span className="text-orange-600">PNG로 변환</span>
                  </p>
                </div>
                <button
                  onClick={removeFile}
                  className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors shrink-0"
                  title="파일 제거"
                >
                  <X size={13} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                다른 파일을 드래그하면 교체됩니다
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── 액션 버튼들 ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 파일 저장 */}
        <button
          onClick={handleSave}
          disabled={isSaving || files.length === 0}
          className={`flex flex-col items-center gap-1.5 px-4 py-4 rounded-xl text-sm transition-all ${
            isSaving || files.length === 0
              ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              : "bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg active:scale-[0.98]"
          }`}
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          ) : isSaved ? (
            <CheckCircle2 size={20} />
          ) : (
            <Archive size={20} />
          )}
          <span>{isSaving ? "변환 중..." : isSaved ? "저장 완료" : "파일 저장"}</span>
          <span className={`text-xs ${isSaving || files.length === 0 ? "text-gray-300" : "text-orange-200"}`}>
            PNG 변환 → 폴더 저장
          </span>
        </button>

        {/* IE 자동 로그인 */}
        <button
          onClick={handleExecute}
          disabled={!canExecute}
          className={`flex flex-col items-center gap-1.5 px-4 py-4 rounded-xl text-sm transition-all ${
            !canExecute
              ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              : "bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg active:scale-[0.98]"
          }`}
        >
          <Play size={20} fill="currentColor" />
          <span>IE 자동 로그인</span>
          <span className={`text-xs ${!canExecute ? "text-gray-300" : "text-blue-200"}`}>
            프로토콜 실행
          </span>
        </button>

        {/* 초기화 */}
        <button
          onClick={handleReset}
          className="flex flex-col items-center gap-1.5 px-4 py-4 rounded-xl text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
        >
          <RefreshCcw size={20} />
          <span>전체 초기화</span>
          <span className="text-xs text-gray-400">입력값 리셋</span>
        </button>
      </div>

      {/* ─── 시스템 로그 ─── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex-1 flex flex-col">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-gradient-to-r from-gray-50 to-slate-50">
          <AlertTriangle size={14} className="text-gray-500" />
          <span className="text-xs text-gray-600">시스템 로그</span>
        </div>
        <div className="p-4 font-mono text-xs flex-1 overflow-y-auto bg-gray-50/50 min-h-[200px]">
          {logMessages.length === 0 ? (
            <div className="space-y-1.5">
              <p className="text-gray-400">사용 가이드:</p>
              <p className="text-gray-500 pl-2">1. 사번(5자리)과 비밀번호를 입력하세요.</p>
              <p className="text-gray-500 pl-2">2. 스캔 파일(PNG/JPG/PDF)을 업로드하세요.</p>
              <p className="text-gray-500 pl-2">3. [파일 저장] — PNG 변환 → 폴더에 개별 저장</p>
              <p className="text-gray-500 pl-2">4. [IE 자동 로그인] — 스캔 시스템 접속</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {logMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`break-all ${
                    msg.includes("[오류]")
                      ? "text-red-600"
                      : msg.includes("완료")
                      ? "text-green-600"
                      : "text-gray-600"
                  }`}
                >
                  <span className="text-gray-400">› </span>{msg}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── 보안 안내 ─── */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
        <p>
          <strong>보안 안내:</strong> 이 도구는 내부 업무 자동화 용도입니다. URL
          파라미터를 통해 인증 정보를 전달하므로 외부 네트워크에서의 사용에
          주의하세요.
        </p>
      </div>
    </div>
  );
}