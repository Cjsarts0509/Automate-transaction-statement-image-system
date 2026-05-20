import { useState } from "react";
import { ScannerInterface } from "./components/ScannerInterface";
import { ExtensionGuide } from "./components/ExtensionGuide";
import { Toaster } from "sonner";
import { ChevronDown, Monitor, ScanLine } from "lucide-react";

/**
 * 처음 방문 또는 IE 자동 로그인을 한 번도 성공하지 않은 사용자에게는 IE 모드
 * 초기 설정 가이드를 펼친 상태로 보여주고, 한 번이라도 IE 자동 로그인을 호출한
 * 사용자에게는 접힌 상태로 시작한다. (플래그는 ScannerInterface에서 기록)
 */
function getInitialSetupOpen(): boolean {
  try {
    return localStorage.getItem("ie-setup-completed") !== "true";
  } catch {
    return true;
  }
}

export default function App() {
  const [setupOpen, setSetupOpen] = useState(getInitialSetupOpen);

  return (
    <div className="min-h-screen bg-[#EDEFF3] p-4 sm:p-6 font-sans text-gray-900 flex items-center justify-center">
      <div className="max-w-6xl w-full space-y-5">
        {/* Header */}
        <div
          className="bg-[#0A2463] rounded-xl px-6 py-4 flex items-center gap-3 shadow-lg anim-fade-in-up"
          style={{ animationDelay: "0ms" }}
        >
          <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
            <ScanLine size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white text-base sm:text-lg tracking-tight">
              거래명세서 이미지시스템 자동화
            </h1>
            <p className="text-[#8BA4D9] text-[11px]">내부 업무용 · 외부 배포 금지</p>
          </div>
        </div>

        {/* IE 모드 초기 설정 (접을 수 있음, 펼침 모션) */}
        <div
          className="bg-white rounded-xl shadow-sm border border-[#D1D1D1] overflow-hidden anim-fade-in-up"
          style={{ animationDelay: "60ms" }}
        >
          <button
            type="button"
            onClick={() => setSetupOpen((v) => !v)}
            aria-expanded={setupOpen}
            className="w-full bg-[#0A2463] px-5 py-3 flex items-center gap-3 hover:bg-[#0B2870] transition-colors"
          >
            <div className="w-6 h-6 rounded bg-[#3CB043] flex items-center justify-center">
              <Monitor size={13} className="text-white" />
            </div>
            <div className="text-left flex-1">
              <h2 className="text-white text-sm">IE 모드 초기 설정</h2>
              <p className="text-[#8BA4D9] text-[10px]">
                {setupOpen ? "최초 1회 설치 — 설정 후 접어두세요" : "이미 설정 완료 (클릭해 펼치기)"}
              </p>
            </div>
            <ChevronDown
              size={18}
              className={`text-white transition-transform duration-200 ${setupOpen ? "rotate-180" : ""}`}
            />
          </button>
          <div className={`anim-collapsible ${setupOpen ? "is-open" : ""}`} aria-hidden={!setupOpen}>
            <div>
              <div className="p-5">
                <ExtensionGuide />
              </div>
            </div>
          </div>
        </div>

        {/* 메인 스캐너 인터페이스 */}
        <div
          className="bg-white rounded-xl shadow-sm border border-[#D1D1D1] overflow-hidden flex flex-col anim-fade-in-up"
          style={{ animationDelay: "120ms" }}
        >
          <div className="bg-[#0068B7] px-5 py-3 flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
              <ScanLine size={13} className="text-white" />
            </div>
            <div>
              <h2 className="text-white text-sm">스캔시스템 인터페이스</h2>
              <p className="text-[#A8D4F5] text-[10px]">파일 변환 · 업로드 · 로그인</p>
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <ScannerInterface />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-[#888] py-1">
          입력하신 사원번호와 비밀번호는 별도로 저장되지 않습니다
        </div>
      </div>
      <Toaster
        position="bottom-center"
        richColors
        expand={true}
        visibleToasts={5}
        duration={3000}
        toastOptions={{
          style: {
            minWidth: "320px",
          },
        }}
      />
    </div>
  );
}
