const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const money = (value: number) => brl.format(Number.isFinite(value) ? value : 0);

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Accepts both "1.234,56" (pt-BR) and "1234.56" inputs. */
export function parseDecimal(raw: string | number): number {
  if (typeof raw === "number") return raw;
  const value = raw.trim().replace(/[R$\s]/g, "");
  if (!value) return Number.NaN;
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
  return Number(normalized);
}

export const formatDecimalInput = (value: number) =>
  Number.isFinite(value) ? value.toFixed(2).replace(".", ",") : "";

export const percent = (value: number, digits = 1) =>
  `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: digits })}%`;
