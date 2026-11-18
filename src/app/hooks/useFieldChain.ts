import { useEffect, useRef } from "react";

/**
 * 같은 화면에서 [data-field-chain] 속성을 가진 input 요소들을
 * Enter 키로 순차 이동시키고, 각 input의 maxLength가 채워지면
 * 다음 필드로 자동 포커스 이동시킨다.
 *
 * 사용법:
 *   <input data-field-chain="login" ... />
 *
 * 같은 chain 이름을 가진 요소들이 그룹핑되며, 그룹 내 마지막 필드에서
 * Enter는 onSubmit 콜백을 호출한다 (Ctrl+Enter로도 호출 가능).
 */
export function useFieldChain(chainName: string, onSubmit?: () => void) {
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    const selector = `input[data-field-chain="${chainName}"]`;

    function inputs(): HTMLInputElement[] {
      return Array.from(document.querySelectorAll<HTMLInputElement>(selector)).filter(
        (el) => !el.disabled && el.offsetParent !== null
      );
    }

    // submitAtEnd: Enter로 이동할 때만 true. 입력이 maxLength에 닿아 자동 이동하는
    // 경우엔 마지막 필드에서 저장을 트리거하지 않는다 (의도치 않은 저장 + 이전 렌더
    // 값으로 저장되는 문제 방지).
    function focusNext(current: HTMLInputElement, submitAtEnd: boolean) {
      const all = inputs();
      const idx = all.indexOf(current);
      if (idx >= 0 && idx < all.length - 1) {
        all[idx + 1].focus();
        all[idx + 1].select?.();
      } else if (idx === all.length - 1 && submitAtEnd) {
        onSubmitRef.current?.();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (!target || !(target instanceof HTMLInputElement)) return;
      if (target.dataset.fieldChain !== chainName) return;

      // Ctrl+Enter 어디서나 submit
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onSubmitRef.current?.();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        focusNext(target, true);
      }
    }

    function onInput(e: Event) {
      const target = e.target as HTMLInputElement | null;
      if (!target || !(target instanceof HTMLInputElement)) return;
      if (target.dataset.fieldChain !== chainName) return;
      const max = target.maxLength;
      // 커서가 끝에 있을 때만 자동 이동 — 가득 찬 필드의 중간 글자를 고칠 때 튀지 않게
      const caretAtEnd = target.selectionStart === null || target.selectionStart >= max;
      if (max > 0 && target.value.length >= max && caretAtEnd) {
        focusNext(target, false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("input", onInput);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("input", onInput);
    };
  }, [chainName]);
}
