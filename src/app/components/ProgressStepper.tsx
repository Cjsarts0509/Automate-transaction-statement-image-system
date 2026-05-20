import { Check } from "lucide-react";
import { Fragment } from "react";

export type StepStatus = "done" | "current" | "pending";

export interface Step {
  label: string;
  status: StepStatus;
}

interface Props {
  steps: Step[];
}

export default function ProgressStepper({ steps }: Props) {
  return (
    <ol className="flex items-start justify-between gap-2 select-none w-full">
      {steps.map((s, i) => {
        const isDone = s.status === "done";
        const isCurrent = s.status === "current";

        const circleCls = isDone
          ? "bg-[#3CB043] text-white border-[#3CB043] shadow-sm"
          : isCurrent
          ? "bg-[#0068B7] text-white border-[#0068B7] ring-4 ring-[#0068B7]/15 shadow-sm animate-[pop_220ms_ease-out]"
          : "bg-white text-[#999] border-[#D1D1D1]";

        const labelCls = isDone
          ? "text-[#3CB043]"
          : isCurrent
          ? "text-[#0068B7] font-semibold"
          : "text-[#999]";

        const nextDone = i < steps.length - 1 && steps[i + 1].status === "done";
        const lineCls = isDone || nextDone ? "bg-[#3CB043]" : "bg-[#E5E7EB]";

        return (
          <Fragment key={s.label}>
            <li className="flex flex-col items-center gap-2 min-w-0 flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-semibold leading-none transition-all ${circleCls}`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isDone ? <Check size={16} strokeWidth={3} /> : <span>{i + 1}</span>}
              </div>
              <span className={`text-[11px] leading-tight whitespace-nowrap transition-colors ${labelCls}`}>
                {s.label}
              </span>
            </li>
            {i < steps.length - 1 && (
              <div className="flex-1 flex items-start pt-[18px] min-w-[16px]">
                <div className={`h-[3px] w-full rounded-full transition-colors ${lineCls}`} />
              </div>
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
