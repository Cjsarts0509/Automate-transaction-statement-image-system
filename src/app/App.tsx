import { ScannerInterface } from "./components/ScannerInterface";
import { ExtensionGuide } from "./components/ExtensionGuide";
import { Toaster } from "sonner";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 p-4 sm:p-8 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1.5 py-2">
          <h1 className="text-2xl sm:text-3xl text-gray-900 tracking-tight font-[IBM_Plex_Mono] font-bold">
            교보문고 거래명세서 이미지시스템 자동화
          </h1>
          
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
          {/* Left Panel - 3/5 */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h2 className="text-white flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/20 text-white text-xs backdrop-blur-sm">
                  A
                </span>
                <span className="text-sm sm:text-base font-[Crimson_Text] font-bold">스캔시스템 인터페이스</span>
              </h2>
            </div>
            <div className="p-5 sm:p-6 flex-1 flex flex-col">
              <ScannerInterface />
            </div>
          </div>

          {/* Right Panel - 2/5 */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4">
              <h2 className="text-white flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/20 text-white text-xs backdrop-blur-sm">
                  B
                </span>
                <span className="text-sm sm:text-base font-[Crimson_Text] font-bold">IE 모드 초기 설정</span>
              </h2>
            </div>
            <div className="p-5 sm:p-6 flex-1">
              <ExtensionGuide />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-2">
          교보문고 내부 업무용 · 외부 배포 금지
        </div>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}