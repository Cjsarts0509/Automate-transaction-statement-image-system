/**
 * 파일에서 미리보기 이미지 URL을 생성한다.
 * - 이미지: createObjectURL로 직접 미리보기
 * - PDF: pdf.js로 1페이지를 thumbnail 크기로 렌더링하여 Data URL 반환
 * 반환된 URL이 createObjectURL이면 호출자가 revoke 책임을 진다 (revoke 여부 함께 반환).
 */
export interface PreviewResult {
  url: string;
  /** true면 URL.revokeObjectURL을 호출해야 함 */
  revokable: boolean;
}

export async function makePreview(file: File): Promise<PreviewResult | null> {
  const lower = file.name.toLowerCase();
  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/.test(lower)) {
    return { url: URL.createObjectURL(file), revokable: true };
  }
  if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
    try {
      const { renderPdfThumbnail } = await import("./pdf");
      const dataUrl = await renderPdfThumbnail(file);
      return { url: dataUrl, revokable: false };
    } catch {
      return null;
    }
  }
  return null;
}
