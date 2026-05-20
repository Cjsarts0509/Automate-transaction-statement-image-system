import { useRef } from "react";
import { AlertCircle, Building2, Calendar, CheckCircle2, FileText, Hash } from "lucide-react";
import { fromDateInputValue, toDateInputValue } from "../utils/file";
import { isFutureDate, isValidYYYYMMDD } from "../utils/validation";

export interface OverseasFieldsValue {
  invoiceDate: string;
  supplierCode: string;
  invoiceNumber: string;
}

interface Props {
  value: OverseasFieldsValue;
  onChange: (v: OverseasFieldsValue) => void;
}

export function OverseasFields({ value, onChange }: Props) {
  const dateRef = useRef<HTMLInputElement>(null);

  const dateFilled = value.invoiceDate.length === 8;
  const dateValid = dateFilled && isValidYYYYMMDD(value.invoiceDate);
  const dateFuture = dateValid && isFutureDate(value.invoiceDate);

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-[11px] text-[#666] mb-1">
          인보이스발행일 <span className="text-[#999]">(YYYYMMDD)</span>
        </label>
        <div className="relative">
          <Hash size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            type="text"
            data-field-chain="scan"
            maxLength={8}
            placeholder="20260101"
            aria-invalid={dateFilled && !dateValid}
            className={`w-full border bg-[#F8F9FB] rounded-lg pl-7 pr-16 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0068B7] text-sm transition-all placeholder:text-[#AAA] font-mono ${
              dateFilled && !dateValid
                ? "border-[#DC3545] focus:border-[#DC3545]"
                : "border-[#D1D1D1] focus:border-[#0068B7]"
            }`}
            value={value.invoiceDate}
            onChange={(e) =>
              onChange({
                ...value,
                invoiceDate: e.target.value.replace(/[^0-9]/g, "").slice(0, 8),
              })
            }
          />
          {dateValid && (
            <CheckCircle2 size={13} className="absolute right-9 top-1/2 -translate-y-1/2 text-[#3CB043]" />
          )}
          {dateFilled && !dateValid && (
            <AlertCircle size={13} className="absolute right-9 top-1/2 -translate-y-1/2 text-[#DC3545]" />
          )}
          <button
            type="button"
            onClick={() => {
              dateRef.current?.focus();
              dateRef.current?.click();
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#E3F2FD] transition-colors text-[#0068B7]"
            title="달력에서 선택"
            aria-label="달력에서 날짜 선택"
          >
            <Calendar size={14} />
          </button>
          <input
            ref={dateRef}
            type="date"
            className="absolute top-0 right-0 w-8 h-full opacity-0 cursor-pointer"
            tabIndex={-1}
            value={toDateInputValue(value.invoiceDate)}
            onChange={(e) =>
              onChange({
                ...value,
                invoiceDate: fromDateInputValue(e.target.value),
              })
            }
          />
        </div>
        <div
          className={`h-[14px] mt-0.5 text-[10px] leading-[14px] transition-opacity duration-150 ${
            (dateFilled && !dateValid) || dateFuture ? "opacity-100" : "opacity-0"
          } ${dateFilled && !dateValid ? "text-[#DC3545]" : "text-[#F59E0B]"}`}
          aria-live="polite"
        >
          {dateFilled && !dateValid
            ? "존재하지 않는 날짜입니다"
            : dateFuture
            ? "⚠ 미래 날짜입니다. 확인해 주세요"
            : " "}
        </div>
      </div>
      <div>
        <label className="block text-[11px] text-[#666] mb-1">
          매입처코드 <span className="text-[#999]">(7자리)</span>
        </label>
        <div className="relative">
          <Building2 size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            type="text"
            data-field-chain="scan"
            maxLength={7}
            placeholder="0000000"
            className="w-full border border-[#D1D1D1] bg-[#F8F9FB] rounded-lg pl-7 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0068B7] focus:border-[#0068B7] text-sm transition-all placeholder:text-[#AAA] font-mono"
            value={value.supplierCode}
            onChange={(e) =>
              onChange({
                ...value,
                supplierCode: e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7),
              })
            }
          />
          {value.supplierCode.length === 7 && (
            <CheckCircle2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3CB043]" />
          )}
        </div>
      </div>
      <div>
        <label className="block text-[11px] text-[#666] mb-1">
          인보이스관리번호 <span className="text-[#999]">(14자리)</span>
        </label>
        <div className="relative">
          <FileText size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            type="text"
            data-field-chain="scan"
            maxLength={14}
            placeholder="00000000000000"
            className="w-full border border-[#D1D1D1] bg-[#F8F9FB] rounded-lg pl-7 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0068B7] focus:border-[#0068B7] text-sm transition-all placeholder:text-[#AAA] font-mono"
            value={value.invoiceNumber}
            onChange={(e) =>
              onChange({
                ...value,
                invoiceNumber: e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 14),
              })
            }
          />
          {value.invoiceNumber.length === 14 && (
            <CheckCircle2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3CB043]" />
          )}
        </div>
      </div>
    </div>
  );
}
