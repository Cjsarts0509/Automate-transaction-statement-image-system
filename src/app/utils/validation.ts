/**
 * 한국 사업자등록번호 체크섬 검증 (10자리)
 * 가중치 [1,3,7,1,3,7,1,3,5]를 각 자리수에 곱한 합 + (9번째 자리수 * 5 / 10의 내림)
 * 의 10 보수가 마지막(10번째) 자리수와 일치해야 함.
 */
export function isValidBizNumber(num: string): boolean {
  if (!/^\d{10}$/.test(num)) return false;
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(num[i], 10) * weights[i];
  }
  sum += Math.floor((parseInt(num[8], 10) * 5) / 10);
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(num[9], 10);
}

/**
 * YYYYMMDD 형식의 날짜가 유효한 실제 날짜인지 검증
 * (예: 20260230 → 2월 30일 없음, false)
 */
export function isValidYYYYMMDD(s: string): boolean {
  if (!/^\d{8}$/.test(s)) return false;
  const y = parseInt(s.slice(0, 4), 10);
  const m = parseInt(s.slice(4, 6), 10);
  const d = parseInt(s.slice(6, 8), 10);
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

/** YYYYMMDD 날짜가 미래인지 (오늘보다 뒤인지) */
export function isFutureDate(s: string): boolean {
  if (!isValidYYYYMMDD(s)) return false;
  const y = parseInt(s.slice(0, 4), 10);
  const m = parseInt(s.slice(4, 6), 10);
  const d = parseInt(s.slice(6, 8), 10);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() > today.getTime();
}
