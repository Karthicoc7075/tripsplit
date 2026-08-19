import type { Outing, Transaction } from "@/types";
import { getTransactionDate } from "@/lib/dashboard";
import { parseLocalDate } from "@/lib/format";
import { getOutingMembers } from "@/lib/members";

/**
 * What the Dashboard should lead with right now.
 *
 * The question in a user's head changes completely across a trip's life —
 * "who owes me?" at home, "what will it cost?" while planning, "how much is
 * left?" mid-trip — so the page leads with the one that matches.
 */
export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export type DashboardContext =
  | {
      mode: "home";
      /** The most recent finished outing, so an empty dashboard still says something. */
      lastOuting?: { outing: Outing; daysAgo: number };
      /**
       * An outing marked settled whose dates are still ahead. Almost always a
       * mistake — settled outings are never re-derived, so it would stay
       * invisible on the dashboard right through the trip.
       */
      settledButUpcoming?: { outing: Outing; startsInDays: number };
    }
  | {
      mode: "planning";
      outing: Outing;
      startsInDays: number;
      /** Advance money already spent — deposits, tickets, bookings. */
      booked: number;
      memberCount: number;
      perHead?: number;
      /** A week out or less — the strip leans on the reader. */
      isUrgent: boolean;
      /** What still needs doing before the trip. */
      checklist: ChecklistItem[];
    }
  | {
      mode: "active";
      outing: Outing;
      totalSpent: number;
      spentToday: number;
      budget?: number;
      budgetLeft?: number;
      usedPct?: number;
      /** 1-based day within the trip, when dates are known. */
      dayIndex?: number;
      totalDays?: number;
      daysLeft?: number;
      burnPerDay?: number;
      projectedTotal?: number;
      /** How far over budget the current burn rate lands. */
      projectedOverBy?: number;
    };

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDay(value?: string): Date | null {
  const d = parseLocalDate(value);
  return d ? startOfDay(d) : null;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Picks the outing to lead with: the ongoing one finishing soonest, else the
 * planned one starting soonest. An outing without dates still counts as
 * ongoing — it just gets no day counter.
 */
export function getDashboardContext(
  outings: Outing[],
  transactions: Transaction[],
  now: Date = new Date()
): DashboardContext {
  const today = startOfDay(now);

  const ongoing = outings.filter((o) => o.status === "ongoing");
  if (ongoing.length > 0) {
    const outing = [...ongoing].sort((a, b) => {
      // An explicit pin beats any date heuristic.
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      const aEnd = parseDay(a.endDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bEnd = parseDay(b.endDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      if (aEnd !== bEnd) return aEnd - bEnd;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];

    const txs = transactions.filter((t) => t.outingId === outing.id);
    const totalSpent = round(txs.reduce((s, t) => s + t.amount, 0));
    const spentToday = round(
      txs
        .filter((t) => startOfDay(getTransactionDate(t)).getTime() === today.getTime())
        .reduce((s, t) => s + t.amount, 0)
    );

    const start = parseDay(outing.startDate);
    const end = parseDay(outing.endDate);

    let dayIndex: number | undefined;
    let totalDays: number | undefined;
    let daysLeft: number | undefined;
    if (start) {
      dayIndex = Math.max(daysBetween(start, today) + 1, 1);
      if (end) {
        totalDays = Math.max(daysBetween(start, end) + 1, 1);
        dayIndex = Math.min(dayIndex, totalDays);
        daysLeft = Math.max(daysBetween(today, end), 0);
      }
    }

    const budget = outing.budget && outing.budget > 0 ? outing.budget : undefined;
    const budgetLeft = budget != null ? round(budget - totalSpent) : undefined;
    const usedPct =
      budget != null ? Math.min(Math.round((totalSpent / budget) * 100), 999) : undefined;

    // Burn rate only means something once at least one day has elapsed.
    const burnPerDay = dayIndex != null && dayIndex > 0 ? round(totalSpent / dayIndex) : undefined;
    const projectedTotal =
      burnPerDay != null && totalDays != null ? round(burnPerDay * totalDays) : undefined;
    const projectedOverBy =
      projectedTotal != null && budget != null && projectedTotal > budget
        ? round(projectedTotal - budget)
        : undefined;

    return {
      mode: "active",
      outing,
      totalSpent,
      spentToday,
      budget,
      budgetLeft,
      usedPct,
      dayIndex,
      totalDays,
      daysLeft,
      burnPerDay,
      projectedTotal,
      projectedOverBy,
    };
  }

  const planned = outings.filter((o) => o.status === "planned");
  if (planned.length > 0) {
    const outing = [...planned].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      const aStart = parseDay(a.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bStart = parseDay(b.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      return aStart - bStart;
    })[0];

    const start = parseDay(outing.startDate);
    const booked = round(
      transactions
        .filter((t) => t.outingId === outing.id)
        .reduce((s, t) => s + t.amount, 0)
    );
    const memberCount = getOutingMembers(outing).length;
    const budget = outing.budget && outing.budget > 0 ? outing.budget : undefined;

    const startsInDays = start ? Math.max(daysBetween(today, start), 0) : 0;

    return {
      mode: "planning",
      outing,
      startsInDays,
      booked,
      memberCount,
      perHead: budget != null && memberCount > 0 ? round(budget / memberCount) : undefined,
      isUrgent: startsInDays <= 7,
      checklist: [
        { id: "dates", label: "Dates set", done: !!outing.startDate && !!outing.endDate },
        { id: "friends", label: "Friends added", done: memberCount > 1 },
        { id: "budget", label: "Budget set", done: budget != null },
      ],
    };
  }

  // ── Home: nothing running, so say what happened last and flag anything odd.
  const settledUpcoming = outings
    .filter((o) => isPrematurelySettled(o, today))
    .sort((a, b) => {
      const aStart = parseDay(a.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bStart = parseDay(b.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      return aStart - bStart;
    })[0];

  const past = outings
    .map((o) => ({ outing: o, when: outingEndDay(o) }))
    .filter((x) => x.when != null && x.when.getTime() <= today.getTime())
    .sort((a, b) => b.when!.getTime() - a.when!.getTime())[0];

  return {
    mode: "home",
    lastOuting: past
      ? { outing: past.outing, daysAgo: daysBetween(past.when!, today) }
      : undefined,
    settledButUpcoming: settledUpcoming
      ? {
          outing: settledUpcoming,
          startsInDays: Math.max(
            daysBetween(today, parseDay(settledUpcoming.startDate) ?? today),
            0
          ),
        }
      : undefined,
  };
}

/** Last day an outing covers, for ordering finished trips. */
function outingEndDay(outing: Outing): Date | null {
  return (
    parseDay(outing.endDate) ??
    parseDay(outing.startDate) ??
    parseDay(outing.createdAt)
  );
}

/**
 * Marked settled, but its dates are still in the future.
 *
 * `myOutings` never re-derives a settled outing, so this one would stay off the
 * dashboard for its entire trip. Surfaced rather than silently overridden —
 * settling early can be deliberate, so the user decides.
 */
export function isPrematurelySettled(outing: Outing, today: Date = new Date()): boolean {
  if (outing.status !== "settled") return false;
  const last = parseDay(outing.endDate) ?? parseDay(outing.startDate);
  return last != null && last.getTime() > startOfDay(today).getTime();
}
