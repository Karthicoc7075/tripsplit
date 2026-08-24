/**
 * "YYYY-MM-DD" for the *local* calendar day, the format <input type="date"> uses.
 *
 * `toISOString().slice(0, 10)` is UTC: east of Greenwich it returns yesterday
 * for any local time past midnight-minus-offset (after 18:30 in IST), and west
 * of it a date read back with `new Date("YYYY-MM-DD")` lands a day early.
 */
export function toLocalDateInput(date: Date = new Date()): string {
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Parses a "YYYY-MM-DD" calendar date as local midnight.
 *
 * `new Date("2026-08-20")` is parsed as UTC midnight, which in any timezone
 * behind UTC is still the 19th locally — so a trip starting tomorrow would read
 * as already started. Other formats fall through to the normal parser.
 */
export function parseLocalDate(value?: string): Date | null {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * "2026-08-24" → "24 Aug 2026", the shape stored on `Transaction.date`.
 *
 * Shared by the add and edit paths so editing an expense does not quietly
 * rewrite its date into a different format than the one it was created with.
 */
export function toDisplayDate(value?: string): string {
  const parsed = parseLocalDate(value) ?? new Date();
  return parsed.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

/** "HH:MM" for the local wall clock, the format <input type="time"> uses. */
export function toLocalTimeInput(date: Date = new Date()): string {
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Parses "HH:MM" into hours/minutes; null for anything else. */
export function parseTimeInput(value?: string): { hours: number; minutes: number } | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/** "17:20" → "5:20 PM". Returns the raw value if it is not a clock time. */
export function formatClockTime(value?: string): string {
  const parsed = parseTimeInput(value);
  if (!parsed) return value ?? "";
  const d = new Date(2000, 0, 1, parsed.hours, parsed.minutes);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Single place the currency is defined.
 *
 * It was hardcoded as "₹" in ~30 call sites, so supporting anything else meant
 * hunting every string. Everything now reads `getCurrencySymbol()`, and the
 * user's choice is stored under this key.
 */
export const CURRENCY_STORAGE_KEY = "tripsplit-currency";

export const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

const DEFAULT_CURRENCY: CurrencyCode = "INR";

/** Read synchronously so formatting stays a pure, non-async call. */
export function getCurrencyCode(): CurrencyCode {
  if (typeof localStorage === "undefined") return DEFAULT_CURRENCY;
  const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
  return CURRENCIES.some((c) => c.code === stored)
    ? (stored as CurrencyCode)
    : DEFAULT_CURRENCY;
}

export function getCurrencySymbol(code: CurrencyCode = getCurrencyCode()): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "₹";
}

export function setCurrencyCode(code: CurrencyCode) {
  localStorage.setItem(CURRENCY_STORAGE_KEY, code);
  // Formatting is synchronous and read in dozens of components; a reload is the
  // honest way to guarantee every one of them re-renders with the new symbol.
  window.dispatchEvent(new Event("tripsplit-currency-change"));
}

export function formatCurrency(amount: number, showSign = false): string {
  const rounded = roundMoney(amount);
  const formatted = Math.abs(rounded).toLocaleString("en-IN", {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
  });
  const symbol = getCurrencySymbol();
  if (showSign && rounded > 0) return `+${symbol}${formatted}`;
  if (showSign && rounded < 0) return `-${symbol}${formatted}`;
  return `${symbol}${formatted}`;
}

export function formatCompact(amount: number): string {
  const symbol = getCurrencySymbol();
  // Lakh/crore grouping only makes sense for INR.
  if (getCurrencyCode() === "INR" && amount >= 100000) {
    return `${symbol}${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount}`;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}