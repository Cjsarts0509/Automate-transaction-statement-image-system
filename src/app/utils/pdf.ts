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
      /* @vite-ignore */
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
