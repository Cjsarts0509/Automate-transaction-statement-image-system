import { useEffect } from "react";

/**
 * 전역 paste 리스너: 입력 요소(input/textarea/contentEditable)에 포커스가
 * 있을 때는 텍스트 붙여넣기를 그대로 두고, 그 외에서는 클립보드 데이터를
 * 전달해 이미지/URL 업로드 흐름을 트리거한다.
 */
export function useClipboardPaste(
  onPaste: (data: DataTransfer | null) => boolean
) {
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable) {
          return;
        }
      }
      const handled = onPaste(e.clipboardData);
      if (handled) e.preventDefault();
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [onPaste]);
}
