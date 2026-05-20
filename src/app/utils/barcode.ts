/** DataMatrix 바코드를 Canvas로 생성 (bwip-js를 동적 로드) */
async function generateDataMatrixCanvas(data: string): Promise<HTMLCanvasElement> {
  const mod = await import("bwip-js");
  const bwipjs = mod.default;
  const canvas = document.createElement("canvas");
  try {
    bwipjs.toCanvas(canvas, {
      bcid: "datamatrix",
      text: data,
      scale: 3,
      padding: 0,
    });
  } catch (e: any) {
    throw new Error(`DataMatrix 생성 실패: ${e.message || e}`);
  }
  return canvas;
}

/** PNG Blob에 DataMatrix 바코드를 좌측 상단에 오버레이 */
export async function overlayBarcodeOnPng(
  pngBlob: Blob,
  barcodeData: string
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    const url = URL.createObjectURL(pngBlob);
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

  // A4 기준 mm→px 변환 (이미지 너비 = A4 210mm 가정)
  const pixelsPerMm = img.naturalWidth / 210;
  const barcodeSize = Math.round(15 * pixelsPerMm);
  const margin = Math.round(5 * pixelsPerMm);

  const barcodeCanvas = await generateDataMatrixCanvas(barcodeData);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0);

  // 바코드 영역에 흰색 배경
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, margin + barcodeSize + margin, margin + barcodeSize + margin);
  ctx.drawImage(barcodeCanvas, margin, margin, barcodeSize, barcodeSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("바코드 오버레이 실패"))),
      "image/png"
    );
  });
}
