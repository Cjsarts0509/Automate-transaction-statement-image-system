import { ScannerInterface } from "./components/ScannerInterface";
import { ExtensionGuide } from "./components/ExtensionGuide";
import { Toaster } from "sonner";
import { Monitor, ScanLine } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-[#EDEFF3] p-4 sm:p-6 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-[#0A2463] rounded-xl px-6 py-4 flex items-center gap-3 shadow-lg">
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

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch">
          {/* Left Panel - 2/5 */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-[#D1D1D1] overflow-hidden flex flex-col">
            <div className="bg-[#0A2463] px-5 py-3 flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-[#3CB043] flex items-center justify-center">
                <Monitor size={13} className="text-white" />
              </div>
              <div>
                <h2 className="text-white text-sm">IE 모드 초기 설정</h2>
                <p className="text-[#8BA4D9] text-[10px]">최초 1회 설치</p>
              </div>
            </div>
            <div className="p-5 flex-1">
              <ExtensionGuide />
            </div>
          </div>

          {/* Right Panel - 3/5 */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-[#D1D1D1] overflow-hidden flex flex-col">
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
            minWidth: '320px',
          },
        }}
      />
    </div>
  );
}