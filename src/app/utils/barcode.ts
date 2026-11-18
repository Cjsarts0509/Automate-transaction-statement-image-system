// 이미지 너비를 A4(210mm)로 가정하고 바코드를 15mm, 여백을 5mm로 배치한다.
const A4_WIDTH_MM = 210;
const BARCODE_MM = 15;
const MARGIN_MM = 5;
// 이보다 좁은 이미지(예: Win+Shift+S 부분 캡쳐)는 이 너비(A4 @150dpi)로 확대한 뒤
// 바코드를 넣는다. 그대로 두면 600px 캡쳐에서 바코드가 ~43px로 너무 작아진다.
const MIN_OUTPUT_WIDTH = 1240;
// 모듈 1칸당 최소 픽셀 — 스캔 시스템이 안정적으로 읽을 수 있는 하한
const MIN_MODULE_PX = 4;
const MIN_MARGIN_PX = 8;

/** DataMatrix를 1모듈=1px 캔버스로 생성 (bwip-js 동적 로드) */
async function renderDataMatrix(data: string): Promise<HTMLCanvasElement> {
  const mod = await import("bwip-js");
  const bwipjs = mod.default;
  const canvas = document.createElement("canvas");
  try {
    bwipjs.toCanvas(canvas, {
      bcid: "datamatrix",
      text: data,
      scale: 1,
      padding: 0,
    });
  } catch (e: any) {
    const wrapped = new Error(`DataMatrix 생성 실패: ${e?.message || e}`);
    (wrapped as Error & { cause?: unknown }).cause = e;
    throw wrapped;
  }
  return canvas;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    const url = URL.createObjectURL(blob);
    i.onload = () => {
      URL.revokeObjectURL(url);
      resolve(i);
    };
    i.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지 로드 실패"));
    };
    i.src = url;
  });
}

/** PNG Blob에 DataMatrix 바코드를 좌측 상단에 오버레이 */
export async function overlayBarcodeOnPng(
  pngBlob: Blob,
  barcodeData: string
): Promise<Blob> {
  const img = await loadImage(pngBlob);

  // 작은 이미지는 확대해서 바코드가 읽힐 크기를 확보
  const upscale = Math.max(1, MIN_OUTPUT_WIDTH / img.naturalWidth);
  const outW = Math.round(img.naturalWidth * upscale);
  const outH = Math.round(img.naturalHeight * upscale);

  const pixelsPerMm = outW / A4_WIDTH_MM;
  const margin = Math.max(MIN_MARGIN_PX, Math.round(MARGIN_MM * pixelsPerMm));

  // 정수 배율로 확대해야 모듈 경계가 선명하다 (비정수 배율 + 스무딩 → 흐릿)
  const matrix = await renderDataMatrix(barcodeData);
  const targetPx = BARCODE_MM * pixelsPerMm;
  const moduleScale = Math.max(MIN_MODULE_PX, Math.round(targetPx / matrix.width));
  const barcodeW = matrix.width * moduleScale;
  const barcodeH = matrix.height * moduleScale;

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;

  // 원본 이미지는 부드럽게 확대
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, outW, outH);

  // 바코드 영역 흰 배경 + 바코드는 스무딩 없이(nearest-neighbor) 그린다
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, margin * 2 + barcodeW, margin * 2 + barcodeH);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(matrix, margin, margin, barcodeW, barcodeH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("바코드 오버레이 실패"))),
      "image/png"
    );
  });
}
