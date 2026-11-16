import { round2 } from "./currency";

/** Preço = Custo / (1 − Margem). Margin is a decimal in [0, 1). */
export function referencePrice(cost: number, margin: number) {
  if (!Number.isFinite(cost) || !Number.isFinite(margin) || cost < 0 || margin < 0 || margin >= 1) {
    return Number.NaN;
  }
  return round2(cost / (1 - margin));
}

export const sumBy = <T>(items: T[], pick: (item: T) => number) =>
  round2(items.reduce((total, item) => total + pick(item), 0));

export const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const matchesText = (query: string, ...values: (string | number | undefined | null)[]) => {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = normalizeText(
    values.filter((value) => value !== undefined && value !== null).join(" "),
  );
  return terms.every((term) => haystack.includes(term));
};

export const onlyDigits = (value: string) => value.replace(/\D/g, "");
