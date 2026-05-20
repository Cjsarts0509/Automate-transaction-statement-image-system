import { AlertTriangle } from "lucide-react";

interface Props {
  messages: string[];
}

export function LogPanel({ messages }: Props) {
  return (
    <div className="rounded-xl border border-[#D1D1D1] bg-white overflow-hidden flex flex-col h-full">
      <div className="bg-[#F0F4FA] px-5 py-2.5 border-b border-[#B8C9E0] flex items-center gap-2">
        <AlertTriangle size={15} className="text-[#0068B7]" />
        <span className="text-sm text-[#0A2463]">시스템 로그</span>
      </div>
      <div className="p-3 font-mono text-[11px] overflow-y-auto bg-[#FAFBFC] flex-1 min-h-[140px]">
        {messages.length === 0 ? (
          <div className="space-y-1.5">
            <p className="text-[#999]">사용 가이드:</p>
            <p className="text-[#777] pl-2">1. 사번(5자리)과 비밀번호를 입력하세요.</p>
            <p className="text-[#777] pl-2">2. 문구/음반 또는 해외문구 모드를 선택하고 정보를 입력하세요.</p>
            <p className="text-[#777] pl-2">3. 스캔 파일을 업로드하세요 (드래그/클릭/Ctrl+V).</p>
            <p className="text-[#777] pl-2">4. [파일 저장] 클릭 → DataMatrix 바코드 자동 삽입 → 폴더 저장</p>
            <p className="text-[#777] pl-2">5. [IE 자동 로그인] — 스캔 시스템 접속</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`break-all ${
                  msg.includes("[오류]")
                    ? "text-[#DC3545]"
                    : msg.includes("완료")
                    ? "text-[#3CB043]"
                    : "text-[#555]"
                }`}
              >
                <span className="text-[#BBB]">› </span>
                {msg}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
