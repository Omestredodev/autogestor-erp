import type { AppState } from "../domain/types";
import { STATE_VERSION } from "./seed";

export const STORAGE_KEY = "autogestor:demo-state";
const THEME_KEY = "autogestor:theme";

interface StoredEnvelope {
  version: number;
  savedAt: string;
  data: AppState;
}

export type LoadStatus = "restored" | "empty" | "invalid" | "outdated";

const ARRAY_KEYS: (keyof AppState)[] = [
  "brands",
  "categories",
  "products",
  "vehicles",
  "applications",
  "equivalences",
  "customers",
  "suppliers",
  "purchases",
  "movements",
  "sales",
  "returns",
  "payments",
  "receivables",
  "closings",
  "reminders",
  "users",
  "roles",
  "audit",
];

export function isValidState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<AppState>;
  if (state.version !== STATE_VERSION) return false;
  if (!ARRAY_KEYS.every((key) => Array.isArray(state[key]))) return false;
  if (!state.session || typeof state.session.userId !== "string") return false;
  if (!state.users?.some((user) => user.id === state.session!.userId)) return false;
  if (!state.settings || typeof state.seq !== "object") return false;
  return state.products!.every(
    (product) => typeof product.id === "string" && typeof product.stock === "number",
  );
}

export function parseStored(raw: string | null): { state: AppState | null; status: LoadStatus } {
  if (!raw) return { state: null, status: "empty" };
  try {
    const envelope = JSON.parse(raw) as Partial<StoredEnvelope>;
    if (envelope.version !== STATE_VERSION) return { state: null, status: "outdated" };
    return isValidState(envelope.data)
      ? { state: envelope.data, status: "restored" }
      : { state: null, status: "invalid" };
  } catch {
    return { state: null, status: "invalid" };
  }
}

export const serializeState = (state: AppState) =>
  JSON.stringify({
    version: STATE_VERSION,
    savedAt: new Date().toISOString(),
    data: state,
  } satisfies StoredEnvelope);

export function loadState() {
  try {
    return parseStored(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return { state: null, status: "invalid" as LoadStatus };
  }
}

export function saveState(state: AppState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeState(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function loadTheme(): boolean {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark";
  } catch {
    return false;
  }
}

export function saveTheme(dark: boolean) {
  try {
    window.localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    /* storage unavailable */
  }
}
