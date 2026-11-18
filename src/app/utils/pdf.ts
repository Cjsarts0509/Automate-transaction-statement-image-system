/**
 * pdf.js를 앱 번들(지연 로드 청크)에서 불러온다. 이전에는 cdnjs에서 런타임 로드했는데,
 * 사내망·방화벽에서 CDN이 막히면 PDF 변환 자체가 불가능했다. 이제 라이브러리와
 * 워커 모두 같은 출처(GitHub Pages)에서 제공된다.
 */
type PdfJs = typeof import("pdfjs-dist");
let _pdfjsPromise: Promise<PdfJs> | null = null;
function loadPdfJs(): Promise<PdfJs> {
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ])
    .then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    })
    .catch((err) => {
      // 일시적 네트워크 실패 후 재시도할 수 있도록 캐시를 비운다
      _pdfjsPromise = null;
      throw err;
    });
  return _pdfjsPromise;
}

/** PDF 1페이지를 작은 thumbnail Data URL로 렌더링 */
export async function renderPdfThumbnail(file: File, maxWidth = 240): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(maxWidth / baseViewport.width, 1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/png");
}

/** PDF File → PNG Blob[] 변환 */
export async function pdfToPngs(
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
