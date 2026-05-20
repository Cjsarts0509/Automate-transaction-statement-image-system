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
    <ol className="flex items-stretch justify-between gap-1 select-none">
      {steps.map((s, i) => {
        const isDone = s.status === "done";
        const isCurrent = s.status === "current";

        const circleCls = isDone
          ? "bg-[#3CB043] text-white border-[#3CB043]"
          : isCurrent
          ? "bg-[#0068B7] text-white border-[#0068B7] ring-2 ring-[#0068B7]/20 animate-[pop_220ms_ease-out]"
          : "bg-white text-[#999] border-[#D1D1D1]";

        const labelCls = isDone
          ? "text-[#3CB043]"
          : isCurrent
          ? "text-[#0068B7] font-medium"
          : "text-[#999]";

        const nextDone = i < steps.length - 1 && steps[i + 1].status === "done";
        const lineCls = isDone || nextDone ? "bg-[#3CB043]" : "bg-[#E5E7EB]";

        return (
          <Fragment key={s.label}>
            <li className="flex flex-col items-center gap-1 min-w-0 flex-shrink-0">
              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] leading-none transition-colors ${circleCls}`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isDone ? <Check size={12} strokeWidth={3} /> : <span>{i + 1}</span>}
              </div>
              <span className={`text-[10px] leading-tight whitespace-nowrap transition-colors ${labelCls}`}>
                {s.label}
              </span>
            </li>
            {i < steps.length - 1 && (
              <div className="flex-1 flex items-start pt-3 min-w-[12px]">
                <div className={`h-[2px] w-full rounded-full transition-colors ${lineCls}`} />
              </div>
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
