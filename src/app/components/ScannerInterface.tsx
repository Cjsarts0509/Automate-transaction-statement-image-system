import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  Play,
  RefreshCcw,
  FileText,
  Lock,
  User,
  X,
  Archive,
  CheckCircle2,
  ImageIcon,
  FileBarChart,
  Package,
  Globe,
  ClipboardPaste,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  blobToFile,
  formatFileSize,
  isHttpUrl,
  makeClipboardFileName,
  mimeToExt,
  timestamp,
} from "../utils/file";
import { imageToPng } from "../utils/image";
import { overlayBarcodeOnPng } from "../utils/barcode";
import { isValidBizNumber, isValidYYYYMMDD } from "../utils/validation";
import { useClipboardPaste } from "../hooks/useClipboardPaste";
import { useFieldChain } from "../hooks/useFieldChain";
import { makePreview } from "../utils/preview";
import {
  clearDirHandle,
  ensureWritePermission,
  loadDirHandle,
  saveDirHandle,
  uniqueFileName,
} from "../utils/dirHandle";
import { DomesticFields, type DomesticFieldsValue } from "./DomesticFields";
import { OverseasFields, type OverseasFieldsValue } from "./OverseasFields";
import { LogPanel } from "./LogPanel";
import ProgressStepper, { type Step } from "./ProgressStepper";

type ScanMode = "domestic" | "overseas";

interface FileItem {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  type: string;
  file: File;
}

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/pdf",
];
const ACCEPTED_EXT = ".png,.jpg,.jpeg,.webp,.gif,.pdf";
const MAX_LOG_LINES = 200;
// 스캔 시스템에 붙여넣을 권장 저장 경로 (저장 완료 시 클립보드로 복사)
const SCAN_FOLDER_PATH = "C:\\ScanKBB\\scan";
// IE 실행 감지: 이 시간 안에 창 포커스가 빠지지 않으면 설치 안내를 띄운다
const LAUNCH_HINT_MS = 5000;
// 그 뒤에도 늦게 열리는 IE를 성공으로 인정하는 최대 대기 시간
const LAUNCH_WATCH_MS = 60000;

type SaveTarget =
  | { kind: "dir"; handle: FileSystemDirectoryHandle; remembered: boolean }
  | { kind: "zip" };

export function ScannerInterface() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [scanMode, setScanMode] = useState<ScanMode>("domestic");
  const [domesticFields, setDomesticFields] = useState<DomesticFieldsValue>({
    supplierCode: "",
    bizNumber: "",
    firstRegDate: "",
  });
  const [overseasFields, setOverseasFields] = useState<OverseasFieldsValue>({
    invoiceDate: "",
    supplierCode: "",
    invoiceNumber: "",
  });
  const [files, setFiles] = useState<FileItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [ieLoginExecuted, setIeLoginExecuted] = useState(false);
  const [isPageDragOver, setIsPageDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageDragCounterRef = useRef(0);
  // 진행 중인 IE 실행 감지(blur 리스너·타이머) 정리 함수
  const launchWatchCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => launchWatchCleanupRef.current?.(), []);

  // 저장 후 스캔 정보를 고치면 저장된 파일의 바코드와 달라지므로 "저장 완료"를 해제한다
  const handleDomesticChange = (v: DomesticFieldsValue) => {
    setDomesticFields(v);
    setIsSaved(false);
  };
  const handleOverseasChange = (v: OverseasFieldsValue) => {
    setOverseasFields(v);
    setIsSaved(false);
  };

  // 등록된 파일에서 thumbnail 생성 (라이프사이클: 새 파일/언마운트 시 revoke)
  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    let revokable = false;
    let url: string | null = null;
    setPreviewLoading(true);
    makePreview(files[0].file)
      .then((result) => {
        if (cancelled || !result) {
          if (result?.revokable) URL.revokeObjectURL(result.url);
          return;
        }
        url = result.url;
        revokable = result.revokable;
        setPreviewUrl(result.url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
      if (revokable && url) URL.revokeObjectURL(url);
    };
  }, [files]);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogMessages((prev) => [`[${timestamp}] ${msg}`, ...prev].slice(0, MAX_LOG_LINES));
  }, []);

  const handleModeChange = (mode: ScanMode) => {
    if (mode === scanMode) return;
    const hasDomesticInput =
      domesticFields.supplierCode || domesticFields.bizNumber || domesticFields.firstRegDate;
    const hasOverseasInput =
      overseasFields.invoiceDate || overseasFields.supplierCode || overseasFields.invoiceNumber;
    const hasFile = files.length > 0;
    if (hasDomesticInput || hasOverseasInput || hasFile) {
      const ok = window.confirm(
        "모드를 전환하면 현재 입력값과 업로드된 파일이 초기화됩니다.\n계속하시겠습니까?"
      );
      if (!ok) return;
    }
    setScanMode(mode);
    setFiles([]);
    setIsSaved(false);
    setIeLoginExecuted(false);
    setDomesticFields({ supplierCode: "", bizNumber: "", firstRegDate: "" });
    setOverseasFields({ invoiceDate: "", supplierCode: "", invoiceNumber: "" });
    addLog(`모드 전환: ${mode === "domestic" ? "문구/음반" : "해외문구"}`);
    toast.info(`${mode === "domestic" ? "문구/음반" : "해외문구"} 모드로 전환되었습니다.`);
  };

  const getBarcodeData = (): string | null => {
    if (scanMode === "domestic") {
      const { supplierCode, bizNumber, firstRegDate } = domesticFields;
      if (!supplierCode || !bizNumber || !firstRegDate) return null;
      return `004${firstRegDate}${supplierCode}${bizNumber}`;
    } else {
      const { invoiceDate, supplierCode, invoiceNumber } = overseasFields;
      if (!invoiceDate || !supplierCode || !invoiceNumber) return null;
      // 해외 바코드는 발행일을 YYMMDD(6자리)로 압축해 사용 (입력은 YYYYMMDD로 받음)
      const yyMMdd = invoiceDate.slice(2);
      return `006${yyMMdd}${supplierCode}${invoiceNumber}`;
    }
  };

  const isModeFieldsComplete = (): boolean => {
    if (scanMode === "domestic") {
      return (
        domesticFields.supplierCode.length === 7 &&
        isValidBizNumber(domesticFields.bizNumber) &&
        isValidYYYYMMDD(domesticFields.firstRegDate)
      );
    } else {
      return (
        isValidYYYYMMDD(overseasFields.invoiceDate) &&
        overseasFields.supplierCode.length === 7 &&
        overseasFields.invoiceNumber.length === 14
      );
    }
  };

  const processFile = useCallback(
    (file: File) => {
      if (
        !ACCEPTED_TYPES.includes(file.type) &&
        !file.name.match(/\.(png|jpg|jpeg|webp|gif|pdf)$/i)
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

      setFiles([newFile]);
      setIsSaved(false);
      setIeLoginExecuted(false);
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

  // 이미지 URL을 fetch해서 File로 변환 후 등록 (CORS 실패 시 안내)
  const processImageUrl = useCallback(
    async (url: string) => {
      addLog(`이미지 URL 다운로드 시도: ${url}`);
      try {
        const res = await fetch(url, { mode: "cors", credentials: "omit" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const ct = (blob.type || "").toLowerCase();
        const isPdf = ct === "application/pdf" || /\.pdf($|\?)/i.test(url);
        const isImage = ct.startsWith("image/") || /\.(png|jpe?g|webp|gif)($|\?)/i.test(url);
        if (!isImage && !isPdf) {
          toast.error("이미지/PDF가 아닌 URL입니다.");
          addLog(`[오류] 지원하지 않는 콘텐츠 타입: ${ct || "unknown"}`);
          return;
        }
        let name = "";
        try {
          const u = new URL(url);
          const last = u.pathname.split("/").pop() || "";
          if (/\.(png|jpe?g|webp|gif|pdf)$/i.test(last)) name = last;
        } catch {
          /* ignore */
        }
        const ext = isPdf ? "pdf" : mimeToExt(ct || "image/png");
        const file = blobToFile(blob, name || makeClipboardFileName(ext));
        processFile(file);
      } catch (err: any) {
        const msg = err?.message || String(err);
        toast.error(
          "이미지 주소를 가져오지 못했습니다 (CORS). 이미지를 직접 복사해서 붙여넣어 주세요.",
          { duration: 5000 }
        );
        addLog(`[오류] URL fetch 실패: ${msg}`);
      }
    },
    [addLog, processFile]
  );

  // 클립보드 데이터 처리 (이미지 우선, 없으면 URL 텍스트)
  const handleClipboardData = useCallback(
    (data: DataTransfer | null) => {
      if (!data) return false;
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            processFile(blobToFile(blob));
            addLog(`클립보드 이미지 붙여넣기 (${item.type})`);
            return true;
          }
        }
      }
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (item.kind === "file") {
          const blob = item.getAsFile();
          if (blob) {
            processFile(blob);
            return true;
          }
        }
      }
      const text = data.getData("text/plain");
      if (text && isHttpUrl(text)) {
        processImageUrl(text.trim());
        return true;
      }
      return false;
    },
    [addLog, processFile, processImageUrl]
  );

  useClipboardPaste(handleClipboardData);

  // Enter로 다음 필드 이동, 각 필드 채워지면 자동 진행, Ctrl+Enter로 저장
  useFieldChain("scan", () => {
    if (canSave && !isSaving) handleSave();
  });

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

  // 페이지 전체 드래그 오버레이: 카드 밖에서 파일을 드래그해도 드롭 가능.
  // - capture phase로 등록 → dropzone의 stopPropagation이 영향 없게 (counter 항상 일치)
  // - drop이 dropzone 내부에서 일어났다면 dropzone이 직접 처리 → 여기서는 카운터/오버레이만 정리
  // - ESC 안전망: 어떤 이유로든 overlay가 매달려 있으면 사용자가 닫을 수 있도록
  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");

    const isInsideDropzone = (e: DragEvent) =>
      !!(e.target as Element | null)?.closest?.("[data-dropzone]");

    const resetOverlay = () => {
      pageDragCounterRef.current = 0;
      setIsPageDragOver(false);
    };

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      pageDragCounterRef.current += 1;
      setIsPageDragOver(true);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      pageDragCounterRef.current = Math.max(0, pageDragCounterRef.current - 1);
      if (pageDragCounterRef.current === 0) setIsPageDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      // dropzone이 처리할 케이스: 카운터/오버레이만 정리하고 파일 처리는 양보 (중복 방지)
      if (isInsideDropzone(e)) {
        resetOverlay();
        return;
      }
      e.preventDefault();
      resetOverlay();
      const list = e.dataTransfer?.files;
      if (list && list.length > 0) {
        if (list.length > 1) {
          toast.warning("파일은 1개만 업로드할 수 있습니다. 첫 번째 파일만 등록됩니다.");
        }
        processFile(list[0]);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") resetOverlay();
    };

    window.addEventListener("dragenter", onEnter, true);
    window.addEventListener("dragover", onOver, true);
    window.addEventListener("dragleave", onLeave, true);
    window.addEventListener("drop", onDrop, true);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("dragenter", onEnter, true);
      window.removeEventListener("dragover", onOver, true);
      window.removeEventListener("dragleave", onLeave, true);
      window.removeEventListener("drop", onDrop, true);
      window.removeEventListener("keydown", onEscape);
    };
  }, [processFile]);

  const removeFile = () => {
    if (files.length > 0) {
      addLog(`파일 제거: ${files[0].name}`);
    }
    setFiles([]);
    setIsSaved(false);
    setIeLoginExecuted(false);
  };

  const handleReset = () => {
    const hasAnything =
      employeeId ||
      password ||
      files.length > 0 ||
      logMessages.length > 0 ||
      domesticFields.supplierCode ||
      domesticFields.bizNumber ||
      domesticFields.firstRegDate ||
      overseasFields.invoiceDate ||
      overseasFields.supplierCode ||
      overseasFields.invoiceNumber;
    if (hasAnything) {
      const ok = window.confirm("모든 입력값과 로그가 초기화됩니다. 계속하시겠습니까?");
      if (!ok) return;
    }
    setEmployeeId("");
    setPassword("");
    setShowPassword(false);
    setCapsLockOn(false);
    setFiles([]);
    setLogMessages([]);
    setIsSaved(false);
    setIeLoginExecuted(false);
    setDomesticFields({ supplierCode: "", bizNumber: "", firstRegDate: "" });
    setOverseasFields({ invoiceDate: "", supplierCode: "", invoiceNumber: "" });
    toast.info("모든 항목이 초기화되었습니다");
  };

  /**
   * 저장 위치를 확보한다. 폴더 선택 창과 권한 요청은 클릭 직후(user activation이
   * 살아있는 몇 초 안)에만 허용되므로, 변환·바코드 생성보다 반드시 먼저 호출해야 한다.
   * 사용자가 폴더 선택을 취소하면 null.
   * pathCopied: 호출 전에 경로를 클립보드에 넣었는지 — 폴더 선택 창 안내 문구에 사용.
   */
  const acquireSaveTarget = async (pathCopied: boolean): Promise<SaveTarget | null> => {
    if (typeof (window as any).showDirectoryPicker !== "function") {
      addLog("[안내] 이 브라우저는 폴더 저장을 지원하지 않아 ZIP으로 저장합니다.");
      return { kind: "zip" };
    }
    try {
      const remembered = await loadDirHandle();
      if (remembered) {
        if (await ensureWritePermission(remembered)) {
          addLog(`기억된 폴더 사용: ${remembered.name}`);
          return { kind: "dir", handle: remembered, remembered: true };
        }
        addLog("[안내] 기억된 폴더의 권한이 없어 폴더를 다시 선택합니다.");
        await clearDirHandle();
      }
      // 최초 설정: 폴더 선택 창 위쪽 주소창에 경로를 붙여넣어 바로 이동하도록 안내
      addLog(`저장할 폴더를 선택하세요... (권장: ${SCAN_FOLDER_PATH})`);
      toast.info(
        pathCopied
          ? `폴더 선택 창 위쪽 주소창을 클릭 → Ctrl+V → Enter → [폴더 선택]을 누르세요. (${SCAN_FOLDER_PATH} 복사됨)`
          : `폴더 선택 창에서 ${SCAN_FOLDER_PATH} 폴더로 이동한 뒤 [폴더 선택]을 누르세요.`,
        { duration: 15000 }
      );
      const picked: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({
        id: "scan-save-dir",
        mode: "readwrite",
        startIn: "downloads",
      });
      try {
        await saveDirHandle(picked);
        addLog(`폴더를 기억합니다: ${picked.name} (다음부터 자동 저장)`);
      } catch (persistErr: any) {
        addLog(`[안내] 폴더 기억 실패: ${persistErr?.message || persistErr}`);
      }
      return { kind: "dir", handle: picked, remembered: false };
    } catch (err: any) {
      if (err?.name === "AbortError") return null;
      addLog(`[안내] 폴더를 사용할 수 없어 ZIP으로 저장합니다 (${err?.message || err})`);
      return { kind: "zip" };
    }
  };

  const copySavePath = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(SCAN_FOLDER_PATH);
      addLog(`클립보드에 복사됨: ${SCAN_FOLDER_PATH}`);
      return true;
    } catch (clipErr: any) {
      addLog(`[안내] 클립보드 복사 실패: ${clipErr?.message || clipErr}`);
      return false;
    }
  };

  const downloadZip = async (finalFiles: { name: string; blob: Blob }[]): Promise<string> => {
    addLog("ZIP 압축 중...");
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const f of finalFiles) zip.file(f.name, f.blob);
    const blob = await zip.generateAsync({ type: "blob" });
    const zipName = `scan-files-${timestamp()}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return zipName;
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (files.length === 0) {
      toast.error("저장할 파일이 없습니다. 먼저 파일을 업로드하세요.");
      return;
    }
    if (!isModeFieldsComplete()) {
      toast.error("모든 정보 입력 필드를 올바르게 채워주세요.");
      return;
    }
    const barcodeData = getBarcodeData();
    if (!barcodeData) {
      toast.error("바코드 생성에 필요한 정보가 부족합니다.");
      return;
    }

    setIsSaving(true);
    try {
      // 1) 경로 복사를 가장 먼저 — 클릭 직후라 페이지 포커스와 user activation이 살아있다.
      //    폴더 선택 창을 닫은 뒤에는 포커스가 빠져 브라우저가 복사를 거부하고,
      //    최초 설정 때는 이 경로를 폴더 선택 창 주소창에 붙여넣어야 하므로 창보다 먼저여야 한다.
      const pathCopied = await copySavePath();

      // 2) 저장 위치 확보 (변환 뒤로 미루면 클릭 활성화가 만료돼 폴더 선택/권한 요청이 거부됨)
      const target = await acquireSaveTarget(pathCopied);
      if (!target) {
        addLog("저장이 취소되었습니다.");
        toast.warning("저장이 취소되었습니다.");
        return;
      }

      addLog("PNG 변환 시작...");
      addLog(`바코드 데이터: ${barcodeData}`);

      const pngFiles: { name: string; blob: Blob }[] = [];
      let pngIndex = 1;

      for (const fileItem of files) {
        const isPdf =
          fileItem.type === "application/pdf" ||
          fileItem.name.toLowerCase().endsWith(".pdf");
        const isPng =
          fileItem.type === "image/png" ||
          fileItem.name.toLowerCase().endsWith(".png");
        const baseName = fileItem.name.replace(/\.[^.]+$/, "");

        if (isPdf) {
          addLog(`PDF 변환 중: ${fileItem.name}`);
          try {
            const { pdfToPngs } = await import("../utils/pdf");
            const pngBlobs = await pdfToPngs(fileItem.file, addLog);
            for (const blob of pngBlobs) {
              const newName = `${baseName}_Scan_${String(pngIndex).padStart(2, "0")}.png`;
              pngFiles.push({ name: newName, blob });
              pngIndex++;
            }
          } catch (pdfErr: any) {
            addLog(`[오류] PDF 변환 실패: ${pdfErr.message}`);
            const newName = `${baseName}_Scan_${String(pngIndex).padStart(2, "0")}.pdf`;
            pngFiles.push({ name: newName, blob: fileItem.file });
            pngIndex++;
          }
        } else if (isPng) {
          const newName = `${baseName}_Scan_${String(pngIndex).padStart(2, "0")}.png`;
          pngFiles.push({ name: newName, blob: fileItem.file });
          addLog(`변환 완료: ${newName} (원본 PNG: ${fileItem.name})`);
          pngIndex++;
        } else {
          addLog(`PNG 변환 중: ${fileItem.name}`);
          try {
            const pngBlob = await imageToPng(fileItem.file);
            const newName = `${baseName}_Scan_${String(pngIndex).padStart(2, "0")}.png`;
            pngFiles.push({ name: newName, blob: pngBlob });
            addLog(`변환 완료: ${newName} (${fileItem.name} → PNG)`);
            pngIndex++;
          } catch (imgErr: any) {
            addLog(`[오류] 이미지 변환 실패: ${imgErr.message}`);
            const ext = fileItem.name.split(".").pop()?.toLowerCase() || "jpg";
            const newName = `${baseName}_Scan_${String(pngIndex).padStart(2, "0")}.${ext}`;
            pngFiles.push({ name: newName, blob: fileItem.file });
            pngIndex++;
          }
        }
      }

      addLog("DataMatrix 바코드 오버레이 중...");
      const finalFiles: { name: string; blob: Blob }[] = [];
      for (const pngFile of pngFiles) {
        try {
          const overlaid = await overlayBarcodeOnPng(pngFile.blob, barcodeData);
          finalFiles.push({ name: pngFile.name, blob: overlaid });
          addLog(`바코드 삽입 완료: ${pngFile.name}`);
        } catch (barcodeErr: any) {
          addLog(`[경고] 바코드 삽입 실패(${pngFile.name}): ${barcodeErr.message} — 원본 사용`);
          finalFiles.push(pngFile);
        }
      }

      const totalFiles = finalFiles.length;
      addLog(`총 ${totalFiles}개 PNG 파일 준비 완료 (바코드 포함)`);

      // 3) 확보한 위치에 저장. 폴더 쓰기가 실패하면 결과물을 잃지 않도록 ZIP으로 전환
      let doneMessage: string;
      let wroteToDir = false;
      if (target.kind === "dir") {
        try {
          for (const f of finalFiles) {
            const name = await uniqueFileName(target.handle, f.name);
            if (name !== f.name) {
              addLog(`같은 이름의 파일이 있어 다른 이름으로 저장: ${name}`);
            }
            const fileHandle = await target.handle.getFileHandle(name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(f.blob);
            await writable.close();
            addLog(`저장 완료: ${name}`);
          }
          wroteToDir = true;
        } catch (writeErr: any) {
          addLog(`[오류] 폴더 저장 실패: ${writeErr?.message || writeErr} — ZIP으로 전환합니다.`);
          // 폴더가 삭제됐거나 권한이 사라진 경우 다음 저장에서 다시 고르도록 기억을 지운다
          if (target.remembered) await clearDirHandle();
        }
      }

      if (wroteToDir) {
        const how = target.kind === "dir" && target.remembered ? "자동으로 " : "";
        doneMessage = `${totalFiles}개 PNG 파일이 ${how}저장되었습니다`;
        addLog(`폴더 저장 완료! (${totalFiles}개 PNG 파일, 바코드 포함)`);
      } else {
        const zipName = await downloadZip(finalFiles);
        doneMessage = `${zipName} 다운로드 완료`;
        addLog(`${zipName} 다운로드 완료 (${totalFiles}개 PNG 포함, 바코드 포함)`);
      }

      setIsSaved(true);
      if (pathCopied) {
        toast.success(`${doneMessage} — 경로 클립보드에 복사됨`, { duration: 4000 });
      } else {
        // 폴더 선택 창 직후엔 브라우저가 클립보드 쓰기를 막을 수 있어 수동 복사 버튼 제공
        toast.success(doneMessage, {
          duration: 10000,
          action: {
            label: "경로 복사",
            onClick: () => {
              navigator.clipboard.writeText(SCAN_FOLDER_PATH).catch(() => {});
            },
          },
        });
      }
    } catch (err: any) {
      addLog(`[오류] 파일 저장 실패: ${err.message || err}`);
      toast.error("파일 저장 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

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

    // 실행 감지: 프로토콜 핸들러가 설치돼 있으면 브라우저의 "외부 앱 열기" 확인창이나
    // 새로 뜨는 IE 창으로 포커스가 넘어가 window blur가 발생한다. 핸들러가 없으면
    // 브라우저는 아무 반응 없이 무시하므로 blur가 오지 않는다.
    // → 설치 플래그 기록·비밀번호 비우기·진행 단계 완료는 blur가 확인됐을 때만 수행.
    launchWatchCleanupRef.current?.();
    let launched = false;
    const onLaunched = () => {
      if (launched) return;
      launched = true;
      cleanup();
      addLog("프로토콜 실행 확인 — IE 창을 확인하세요.");
      toast.success("IE 자동 로그인을 실행했습니다. IE 창을 확인하세요.", { duration: 4000 });
      try {
        localStorage.setItem("ie-setup-completed", "true");
      } catch {
        /* localStorage 비활성화 환경 — 무시 */
      }
      // 보안: IE로 넘어간 뒤 비밀번호 input/state 비움 (어깨 너머·자동완성 캐시 방지)
      setPassword("");
      setShowPassword(false);
      setCapsLockOn(false);
      setIeLoginExecuted(true);
    };
    const hintTimer = window.setTimeout(() => {
      if (launched) return;
      addLog("[안내] IE가 실행되지 않았다면 'IE 모드 초기 설정' 패키지를 먼저 설치하세요.");
      toast.warning("IE 창이 열리지 않았다면 상단 'IE 모드 초기 설정'을 먼저 설치해 주세요.", {
        duration: 6000,
      });
    }, LAUNCH_HINT_MS);
    const watchTimer = window.setTimeout(() => cleanup(), LAUNCH_WATCH_MS);
    const cleanup = () => {
      window.clearTimeout(hintTimer);
      window.clearTimeout(watchTimer);
      window.removeEventListener("blur", onLaunched);
      launchWatchCleanupRef.current = null;
    };
    launchWatchCleanupRef.current = cleanup;
    window.addEventListener("blur", onLaunched);

    // 커스텀 프로토콜은 비가시 anchor 클릭이 가장 신뢰성 있음 (iframe보다 표준적)
    const a = document.createElement("a");
    a.href = protocolUrl;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const canExecute = employeeId.length === 5 && password.length > 0;
  const canSave = files.length > 0 && isModeFieldsComplete();

  // 진행 단계 (로그인 → 스캔 → 파일 → 저장 → IE 로그인).
  // 각 단계는 자기 조건만으로 판정. 예외: 로그인 정보는 IE 로그인 후 비번이
  // 자동 클리어돼도 후퇴하지 않도록 sticky 처리.
  const loginDone = employeeId.length === 5 && password.length > 0;
  const scanDone = isModeFieldsComplete();
  const fileDone = files.length > 0;
  const steps: Step[] = (() => {
    const dones = [
      loginDone || ieLoginExecuted,
      scanDone,
      fileDone,
      isSaved,
      ieLoginExecuted,
    ];
    const firstPending = dones.findIndex((d) => !d);
    const labels = ["로그인 정보", "스캔 정보", "파일", "저장", "IE 로그인"];
    return labels.map((label, i) => ({
      label,
      status: dones[i] ? "done" : i === firstPending ? "current" : "pending",
    }));
  })();

  return (
    <div className="flex flex-col gap-4">
      {/* ─── 로그인 정보 + 스캔 정보 (반반 레이아웃) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 로그인 정보 */}
        <div className="rounded-xl border border-[#D1D1D1] bg-white overflow-hidden flex flex-col">
          <div className="bg-[#F0F4FA] px-4 py-2 border-b border-[#B8C9E0]">
            <h3 className="text-sm text-[#0A2463] flex items-center gap-2">
              <User size={14} className="text-[#0068B7]" />
              <span>로그인 정보</span>
              <span className="text-[#DC3545] text-[10px] ml-1">*필수</span>
            </h3>
          </div>
          <div className="p-3 flex-1 flex flex-col gap-2.5">
            <div>
              <label className="block text-[11px] text-[#666] mb-1">사번</label>
              <div className="relative">
                <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999]" />
                <input
                  type="text"
                  maxLength={5}
                  placeholder="5자리 사번"
                  data-field-chain="scan"
                  autoFocus
                  autoComplete="off"
                  inputMode="numeric"
                  className="w-full border border-[#D1D1D1] bg-[#F8F9FB] rounded-lg pl-7 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0068B7] focus:border-[#0068B7] text-sm transition-all placeholder:text-[#AAA]"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.replace(/[^0-9]/g, ""))}
                />
                {employeeId.length === 5 && (
                  <CheckCircle2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3CB043]" />
                )}
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-[#666] mb-1">비밀번호</label>
              <div className="relative">
                <Lock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999]" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호 입력"
                  data-field-chain="scan"
                  autoComplete="current-password"
                  spellCheck={false}
                  className="w-full border border-[#D1D1D1] bg-[#F8F9FB] rounded-lg pl-7 pr-14 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0068B7] focus:border-[#0068B7] text-sm transition-all placeholder:text-[#AAA]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                  onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                  onBlur={() => setCapsLockOn(false)}
                />
                {password.length > 0 && (
                  <CheckCircle2 size={13} className="absolute right-9 top-1/2 -translate-y-1/2 text-[#3CB043]" />
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#E3F2FD] transition-colors text-[#666]"
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  title={showPassword ? "숨기기" : "표시"}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div
                className={`h-[14px] mt-0.5 text-[10px] leading-[14px] text-[#F59E0B] flex items-center gap-1 transition-opacity duration-150 ${
                  capsLockOn && password.length > 0 ? "opacity-100" : "opacity-0"
                }`}
                aria-live="polite"
              >
                <AlertTriangle size={10} />
                <span>Caps Lock이 켜져 있습니다</span>
              </div>
            </div>
            <div className="mt-auto -mx-3 -mb-3 px-4 pt-3 pb-4 bg-[#F8FAFC] border-t border-[#E5E7EB]">
              <div className="text-[11px] font-medium text-[#666] mb-2.5 flex items-center gap-1.5">
                <FileBarChart size={12} className="text-[#0068B7]" />
                <span>진행 상황</span>
              </div>
              <ProgressStepper steps={steps} />
            </div>
          </div>
        </div>

        {/* 스캔 정보 입력 */}
        <div className="rounded-xl border border-[#D1D1D1] bg-white overflow-hidden flex flex-col">
          <div className="bg-[#F0F4FA] px-4 py-2 border-b border-[#B8C9E0]">
            <h3 className="text-sm text-[#0A2463] flex items-center gap-2">
              <FileBarChart size={14} className="text-[#0068B7]" />
              <span>스캔 정보</span>
              <span className="text-[#DC3545] text-[10px] ml-1">*필수</span>
            </h3>
          </div>
          <div className="p-3 flex-1 flex flex-col">
            <div className="flex gap-1.5 mb-2.5">
              <button
                onClick={() => handleModeChange("domestic")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs transition-all ${
                  scanMode === "domestic"
                    ? "bg-[#0A2463] text-white shadow-sm"
                    : "bg-[#F0F0F0] text-[#666] hover:bg-[#E0E0E0] border border-[#D1D1D1]"
                }`}
              >
                <Package size={12} />
                <span>문구/음반</span>
              </button>
              <button
                onClick={() => handleModeChange("overseas")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs transition-all ${
                  scanMode === "overseas"
                    ? "bg-[#0068B7] text-white shadow-sm"
                    : "bg-[#F0F0F0] text-[#666] hover:bg-[#E0E0E0] border border-[#D1D1D1]"
                }`}
              >
                <Globe size={12} />
                <span>해외문구</span>
              </button>
            </div>

            <div key={scanMode} className="anim-fade-in">
              {scanMode === "domestic" ? (
                <DomesticFields value={domesticFields} onChange={handleDomesticChange} />
              ) : (
                <OverseasFields value={overseasFields} onChange={handleOverseasChange} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 파일 업로드 + 시스템 로그 (좌우 2열) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:h-[280px]">
      <div className="rounded-xl border border-[#D1D1D1] bg-white overflow-hidden flex flex-col">
        <div className="bg-[#F0F4FA] px-5 py-2.5 border-b border-[#B8C9E0]">
          <h3 className="text-sm text-[#0A2463] flex items-center gap-2">
            <Upload size={15} className="text-[#0068B7]" />
            <span>파일 업로드</span>
            <span className="text-[11px] text-[#999] ml-auto">1개 파일만 가능</span>
          </h3>
        </div>
        <div className="p-3 flex-1 flex flex-col">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXT}
            onChange={handleFileSelect}
            className="hidden"
          />

          {files.length === 0 ? (
            <div
              role="button"
              tabIndex={0}
              data-dropzone
              aria-label="파일을 드래그 & 드롭하거나 클릭하여 선택"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#0068B7] h-full flex flex-col items-center justify-center ${
                isDragOver
                  ? "border-[#0068B7] bg-[#E3F2FD] scale-[1.01]"
                  : "border-[#D1D1D1] hover:border-[#0068B7] hover:bg-[#F0F4FA]"
              }`}
            >
              <div
                className={`w-8 h-8 mb-1.5 rounded-full flex items-center justify-center ${
                  isDragOver ? "bg-[#BBDEFB]" : "bg-[#EDEFF3]"
                }`}
              >
                <ImageIcon size={16} className={isDragOver ? "text-[#0068B7]" : "text-[#999]"} />
              </div>
              <p className="text-xs text-[#444]">
                파일을 <strong className="text-[#0A2463]">드래그 & 드롭</strong>하거나{" "}
                <strong className="text-[#0A2463]">클릭</strong>하여 선택
              </p>
              <p className="text-[11px] text-[#0068B7] mt-1 flex items-center justify-center gap-1">
                <ClipboardPaste size={11} />
                <span>
                  캡쳐(Win+Shift+S)·이미지 복사 후 <strong>Ctrl+V</strong>로도 등록
                </span>
              </p>
              <p className="text-[10px] text-[#999] mt-0.5">
                PNG, JPG, WebP, GIF, PDF → 모두 PNG로 변환
              </p>
            </div>
          ) : (
            <div
              data-dropzone
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="anim-fade-in"
            >
              <div className="flex items-center gap-3 bg-[#E3F2FD] border border-[#0068B7]/30 px-4 py-3 rounded-xl">
                <div className="w-16 h-16 rounded-lg bg-white border border-[#0068B7]/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={`${files[0].name} 미리보기`}
                      className="w-full h-full object-contain"
                    />
                  ) : previewLoading ? (
                    <div className="w-5 h-5 border-2 border-[#BBDEFB] border-t-[#0068B7] rounded-full animate-spin" />
                  ) : (
                    <FileText size={22} className="text-[#0068B7]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#222] truncate">{files[0].name}</p>
                  <p className="text-xs text-[#666]">
                    {files[0].size} ·{" "}
                    <span className="text-[#3CB043]">PNG로 변환 + 바코드 삽입</span>
                  </p>
                </div>
                <button
                  onClick={removeFile}
                  className="w-7 h-7 rounded-full bg-white border border-[#D1D1D1] flex items-center justify-center text-[#999] hover:text-[#DC3545] hover:border-[#DC3545] transition-colors shrink-0"
                  title="파일 제거"
                  aria-label="파일 제거"
                >
                  <X size={13} />
                </button>
              </div>
              <p className="text-[11px] text-[#999] mt-2 text-center">
                다른 파일을 드래그하면 교체됩니다
              </p>
            </div>
          )}
        </div>
      </div>

      <LogPanel messages={logMessages} />
      </div>

      {/* ─── 액션 버튼들 (저장 / 로그인 / 초기화 동급) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving || !canSave}
          className={`flex flex-col items-center gap-1.5 px-4 py-4 rounded-xl text-sm transition-all ${
            isSaving || !canSave
              ? "bg-[#F0F0F0] text-[#BBB] cursor-not-allowed border border-[#D1D1D1]"
              : "bg-[#3CB043] hover:bg-[#34A03B] text-white shadow-md hover:shadow-lg active:scale-[0.98]"
          }`}
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-[#DDD] border-t-[#999] rounded-full animate-spin" />
          ) : isSaved ? (
            <CheckCircle2 size={20} className="anim-pop" />
          ) : (
            <Archive size={20} />
          )}
          <span>{isSaving ? "변환 중..." : isSaved ? "저장 완료" : "파일 저장"}</span>
          <span className={`text-xs ${isSaving || !canSave ? "text-[#CCC]" : "text-white/70"}`}>
            PNG 변환 → 폴더 저장 · <kbd className="font-mono">Ctrl+Enter</kbd>
          </span>
        </button>

        <button
          onClick={handleExecute}
          disabled={!canExecute}
          className={`flex flex-col items-center gap-1.5 px-4 py-4 rounded-xl text-sm transition-all ${
            !canExecute
              ? "bg-[#F0F0F0] text-[#BBB] cursor-not-allowed border border-[#D1D1D1]"
              : "bg-[#0068B7] hover:bg-[#005A9E] text-white shadow-md hover:shadow-lg active:scale-[0.98]"
          }`}
        >
          <Play size={20} fill="currentColor" />
          <span>IE 자동 로그인</span>
          <span className={`text-xs ${!canExecute ? "text-[#CCC]" : "text-white/70"}`}>
            프로토콜 실행
          </span>
        </button>

        <button
          onClick={handleReset}
          className="flex flex-col items-center gap-1.5 px-4 py-4 rounded-xl text-sm bg-[#DC3545] hover:bg-[#C82333] text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
        >
          <RefreshCcw size={20} />
          <span>전체 초기화</span>
          <span className="text-xs text-white/70">입력값 리셋</span>
        </button>
      </div>

      {/* 페이지 전체 드래그 오버레이 — dropzone 밖에서도 드롭 가능 */}
      {isPageDragOver && (
        <div className="fixed inset-0 z-[100] bg-[#0068B7]/15 backdrop-blur-[2px] pointer-events-none flex items-center justify-center animate-[fade-in_120ms_ease-out]">
          <div className="bg-white border-2 border-dashed border-[#0068B7] rounded-2xl px-10 py-8 shadow-2xl flex flex-col items-center gap-3 animate-[pop_220ms_ease-out]">
            <Upload size={56} className="text-[#0068B7]" />
            <div className="text-lg font-medium text-[#0A2463]">파일을 여기에 드롭하세요</div>
            <div className="text-xs text-[#666]">PNG · JPG · WebP · GIF · PDF</div>
          </div>
        </div>
      )}
    </div>
  );
}
