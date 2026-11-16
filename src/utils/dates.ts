const pad = (value: number) => String(value).padStart(2, "0");

const toDate = (value: string | Date) => (value instanceof Date ? value : new Date(value));

export function formatDate(value?: string | Date) {
  if (!value) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatTime(value?: string | Date) {
  if (!value) return "—";
  const date = toDate(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const formatDateTime = (value?: string | Date) =>
  value ? `${formatDate(value)} ${formatTime(value)}` : "—";

export const formatLongDate = (value: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(toDate(value));

export function toInputDate(value: string | Date = new Date()) {
  const date = toDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const toInputTime = (value: string | Date = new Date()) => formatTime(value);

/** Builds an ISO timestamp from local date (yyyy-mm-dd) and time (HH:mm) inputs. */
export function fromInputDateTime(date: string, time = "00:00") {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0);
  return Number.isNaN(result.getTime()) ? "" : result.toISOString();
}

export function startOfDay(value: string | Date) {
  const date = new Date(toDate(value));
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value: string | Date) {
  const date = new Date(toDate(value));
  date.setHours(23, 59, 59, 999);
  return date;
}

export function addDays(value: string | Date, days: number) {
  const date = new Date(toDate(value));
  date.setDate(date.getDate() + days);
  return date;
}

export const addMinutes = (value: string | Date, minutes: number) =>
  new Date(toDate(value).getTime() + minutes * 60_000);

export const isSameDay = (a: string | Date, b: string | Date) => toInputDate(a) === toInputDate(b);

export function isSameMonth(a: string | Date, b: string | Date) {
  const first = toDate(a);
  const second = toDate(b);
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

export type PeriodKey = "today" | "7d" | "30d" | "month" | "all";

export const periodLabels: Record<PeriodKey, string> = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  month: "Mês atual",
  all: "Todo o período",
};

export function periodRange(period: PeriodKey, now: Date = new Date()): { from?: Date; to?: Date } {
  if (period === "all") return {};
  if (period === "today") return { from: startOfDay(now), to: endOfDay(now) };
  if (period === "month")
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
  return { from: startOfDay(addDays(now, period === "7d" ? -6 : -29)), to: endOfDay(now) };
}

export function inRange(value: string, range: { from?: Date; to?: Date }) {
  const time = new Date(value).getTime();
  return (!range.from || time >= range.from.getTime()) && (!range.to || time <= range.to.getTime());
}
