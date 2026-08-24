export type OutingCategory = "Trip" | "Temple" | "Restaurant" | "Movies" | "Other";
export type OutingStatus = "ongoing" | "settled" | "planned";
export type SplitMode = "equally" | "exact" | "percent";

export const OUTING_CATEGORIES: OutingCategory[] = [
  "Trip",
  "Temple",
  "Restaurant",
  "Movies",
  "Other",
];

export const TRANSACTION_CATEGORIES = [
  "Food",
  "Transport",
  "Accommodation",
  "Entertainment",
  "Shopping",
  "Entry Tickets",
  "Parking",
  "Gifts",
  "Medical",
  "Photography",
  "Other",
] as const;

/**
 * Label shown for an outing type. The stored value stays as-is — renaming
 * `"Other"` would orphan every outing already saved with that string.
 */
export const OUTING_CATEGORY_LABELS: Record<OutingCategory, string> = {
  Trip: "Trip",
  Temple: "Temple",
  Restaurant: "Restaurant",
  Movies: "Movies",
  Other: "Casual Outing",
};

/**
 * Expense categories offered per outing type.
 *
 * A temple visit and a five-day trip need different vocabulary, but names that
 * mean the same thing are kept **identical** across sets — Transport, Food,
 * Drinks, Shopping, Parking, Entry Tickets, Other. Category names are stored on
 * every transaction and become permanent history, so "Shopping" and
 * "Shopping / Souvenirs" would show as two separate slices in Reports forever.
 *
 * `primary` is shown up front; `more` sits behind an expander so entering an
 * expense is not a scroll through fifteen chips. Users can always add their own
 * on top of both.
 */
export interface CategoryPreset {
  primary: string[];
  more: string[];
}

export const CATEGORY_PRESETS: Record<OutingCategory, CategoryPreset> = {
  Trip: {
    primary: [
      "Transport",
      "Accommodation",
      "Food",
      "Drinks",
      "Entry Tickets",
      "Activities",
      "Shopping",
      "Parking",
    ],
    more: [
      "Fuel & Tolls",
      "Rental Vehicle",
      "Tour / Guide",
      "Photography",
      "Entertainment",
      "Medical",
      "Other",
    ],
  },
  Temple: {
    primary: [
      "Darshan / Special Entry",
      "Pooja / Archana",
      "Prasadam",
      "Donation / Hundi",
      "Transport",
      "Food",
    ],
    more: ["Accommodation", "Parking", "Footwear / Locker", "Shopping", "Other"],
  },
  Movies: {
    primary: ["Entry Tickets", "Snacks", "Drinks", "Parking"],
    more: ["Convenience Fee", "Transport", "Other"],
  },
  Restaurant: {
    primary: ["Food", "Drinks", "Desserts", "Tip"],
    more: ["Taxes / Service Charge", "Parking", "Transport", "Other"],
  },
  Other: {
    primary: ["Food", "Drinks", "Activities", "Shopping", "Transport"],
    more: ["Parking", "Entertainment", "Other"],
  },
};

/** Falls back to the generic set for custom outing types. */
export function getCategoryPreset(outingCategory: string): CategoryPreset {
  return CATEGORY_PRESETS[outingCategory as OutingCategory] ?? CATEGORY_PRESETS.Other;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Friend {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  addedAt?: string;
  /** UID of the user who initiated the friendship. */
  addedBy?: string;
}

export interface OutingMember {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface TransactionSplit {
  memberId: string;
  amount: number;
}

export interface TransactionPayment {
  memberId: string;
  paidByName: string;
  amount: number;
}

export interface Transaction {
  id: string;
  outingId: string;
  title: string;
  description?: string;
  amount: number;
  paidById: string;
  paidByName: string;
  payments?: TransactionPayment[];
  date: string;
  /**
   * Clock time of the spend as "HH:MM" (24h, local), when the user set one.
   *
   * `createdAt` only says when the expense was typed in, which is wrong for a
   * back-dated entry — logging last night's dinner this morning would order and
   * label it at this morning's time. Optional: older records have none.
   */
  time?: string;
  category?: string;
  splitMode: SplitMode;
  splits: TransactionSplit[];
  receiptUrl?: string;
  createdAt: string;
  createdById: string;
  createdByName: string;
}

export interface Outing {
  id: string;
  name: string;
  category: string;
  date: string;
  status: OutingStatus;
  members: OutingMember[];
  createdAt: string;
  createdById?: string;
  createdByName?: string;
  description?: string;
  location?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  customCategories?: string[];
  /** Kept at the top of the Reports timeline regardless of date. */
  pinned?: boolean;
  /** Free-text memory attached to the outing ("Best sunset of the year"). */
  note?: string;
  /** Free-form labels for filtering ("work", "family", "annual"). */
  tags?: string[];
  /** Hidden from the default timeline without being deleted. */
  archived?: boolean;
}

export interface MemberBalance {
  memberId: string;
  name: string;
  balance: number;
}

export interface DebtEdge {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface Settlement {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  outingId?: string;
  outingName?: string;
}

/** Recorded payment between members. settle = you paid friend; return = friend paid you. */
export type SettlementStatementType = "settle" | "return";

export interface SettlementRecord {
  id: string;
  outingId: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  type: SettlementStatementType;
  createdAt: string;
  recordedById: string;
  recordedByName: string;
}

export interface DashboardStats {
  totalBalance: number;
  youOwe: number;
  youAreOwed: number;
  activeOutings: number;
  oweCount: number;
  owedCount: number;
}

export interface SearchResult {
  id: string;
  type: "outing" | "friend" | "transaction";
  title: string;
  subtitle?: string;
  path: string;
}

export interface CreateOutingInput {
  name: string;
  category: string;
  location?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  friendIds?: string[];
}

const CATEGORY_COLOR_MAP: Record<string, string> = {
  Trip: "hsl(var(--primary))",              // Brand green
  Temple: "hsl(262 83% 58%)",              // Violet
  Restaurant: "hsl(24 95% 50%)",            // Orange
  Movies: "hsl(280 70% 55%)",              // Purple
  Food: "hsl(340 82% 52%)",                // Rose/Crimson
  Home: "hsl(160 84% 39%)",                // Emerald
  Event: "hsl(190 90% 40%)",               // Teal/Cyan
  "Entry Tickets": "hsl(200 95% 45%)",     // Blue
  Parking: "hsl(43 96% 50%)",              // Amber
  Gifts: "hsl(320 85% 55%)",               // Pink
  Medical: "hsl(0 84% 60%)",               // Red
  Photography: "hsl(220 90% 55%)",         // Indigo
  Other: "hsl(var(--muted-foreground))",
};

export function getCategoryColor(category: string): string {
  if (CATEGORY_COLOR_MAP[category]) {
    return CATEGORY_COLOR_MAP[category];
  }

  // Generate a stable color based on string hash for custom categories
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  const saturation = 70 + (Math.abs(hash >> 8) % 15);
  const lightness = 45 + (Math.abs(hash >> 16) % 15);

  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

/** @deprecated Use getCategoryColor instead */
export const CATEGORY_COLORS: Record<string, string> = CATEGORY_COLOR_MAP;