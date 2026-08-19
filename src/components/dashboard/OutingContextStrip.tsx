import { Link } from "react-router-dom";
import {
  Flame, CalendarClock, Plus, AlertTriangle, MapPin, Check, Circle,
  Sparkles, RotateCcw, Pin,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { getCategoryColor } from "@/types";
import type { DashboardContext } from "@/lib/dashboardContext";
import { cn } from "@/lib/utils";

/**
 * Leads the Dashboard with whatever is happening right now — a trip in
 * progress or one coming up — and puts the matching action one tap away.
 * Renders nothing at home, so a quiet dashboard stays quiet.
 */
export function OutingContextStrip({
  context,
  onReopen,
}: {
  context: DashboardContext;
  /** Un-settles an outing whose dates are still ahead. */
  onReopen?: (outingId: string) => void;
}) {
  if (context.mode === "home") {
    return <HomeStrip context={context} onReopen={onReopen} />;
  }

  const { outing } = context;
  const accent = getCategoryColor(outing.category);

  return (
    <div
      className={cn(
        "fintech-card relative overflow-hidden p-4 sm:p-5",
        context.mode === "planning" && context.isUrgent && "border-primary/40 bg-primary/5"
      )}
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: accent }}
        aria-hidden
      />

      <div className="flex flex-col gap-3 pl-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {context.mode === "active" ? (
              <Flame className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
            )}
            <Link
              to={`/outings/${outing.id}`}
              className="truncate font-semibold text-foreground hover:underline"
            >
              {outing.name}
            </Link>
            {outing.pinned && (
              <Pin className="h-3 w-3 shrink-0 fill-current text-primary" aria-label="Pinned" />
            )}
            {outing.location && (
              <span className="hidden min-w-0 items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{outing.location}</span>
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {context.mode === "active" ? (
              <ActiveSummary context={context} />
            ) : (
              <PlanningSummary context={context} />
            )}
          </p>
        </div>

        <Link
          to={`/outings/${outing.id}?add=1`}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {"Add transaction"}
        </Link>
      </div>

      {context.mode === "planning" && context.checklist.some((c) => !c.done) && (
        <div className="mt-3 flex flex-wrap gap-2 pl-3">
          {context.checklist.map((item) => (
            <span
              key={item.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
                item.done
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {item.done ? (
                <Check className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              {item.label}
            </span>
          ))}
        </div>
      )}

      {context.mode === "active" && context.budget != null && context.usedPct != null && (
        <div className="mt-3 pl-3">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                context.usedPct >= 100 ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${Math.min(context.usedPct, 100)}%` }}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
            <span className="text-muted-foreground">
              {formatCurrency(context.totalSpent)} of {formatCurrency(context.budget)} ·{" "}
              {context.usedPct}%
            </span>
            <span
              className={cn(
                "font-medium tabular-nums",
                (context.budgetLeft ?? 0) < 0 ? "text-destructive" : "text-success"
              )}
            >
              {(context.budgetLeft ?? 0) < 0
                ? `${formatCurrency(Math.abs(context.budgetLeft ?? 0))} over`
                : `${formatCurrency(context.budgetLeft ?? 0)} left`}
            </span>
          </div>

          {context.projectedOverBy != null && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                At {formatCurrency(context.burnPerDay ?? 0)}/day you&apos;ll finish{" "}
                <strong>{formatCurrency(context.projectedOverBy)}</strong> over budget.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Home is not "nothing to show" — it is either a mis-settled trip that needs
 * rescuing, or the quiet gap between outings. Both deserve a sentence.
 */
function HomeStrip({
  context,
  onReopen,
}: {
  context: Extract<DashboardContext, { mode: "home" }>;
  onReopen?: (outingId: string) => void;
}) {
  const stray = context.settledButUpcoming;

  if (stray) {
    return (
      <div className="fintech-card border-destructive/40 bg-destructive/5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0">
              <Link
                to={`/outings/${stray.outing.id}`}
                className="font-semibold text-foreground hover:underline"
              >
                {stray.outing.name}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {stray.startsInDays === 0
                  ? "Starts today"
                  : stray.startsInDays === 1
                    ? "Starts tomorrow"
                    : `Starts in ${stray.startsInDays} days`}
                , but it is marked <strong>Settled</strong> — so it stays hidden
                from your dashboard and balances.
              </p>
            </div>
          </div>

          {onReopen && (
            <button
              type="button"
              onClick={() => onReopen(stray.outing.id)}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
            >
              <RotateCcw className="h-4 w-4" /> Reopen
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fintech-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">No trips planned</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {context.lastOuting ? (
                <>
                  Last outing was{" "}
                  <Link
                    to={`/outings/${context.lastOuting.outing.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {context.lastOuting.outing.name}
                  </Link>
                  {context.lastOuting.daysAgo === 0
                    ? ", today"
                    : context.lastOuting.daysAgo === 1
                      ? ", yesterday"
                      : `, ${context.lastOuting.daysAgo} days ago`}
                  .
                </>
              ) : (
                "Create an outing to start splitting expenses."
              )}
            </p>
          </div>
        </div>

        <Link
          to="/outings"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Plan an outing
        </Link>
      </div>
    </div>
  );
}

function ActiveSummary({
  context,
}: {
  context: Extract<DashboardContext, { mode: "active" }>;
}) {
  const parts: string[] = [];

  if (context.dayIndex != null && context.totalDays != null) {
    parts.push(`Day ${context.dayIndex} of ${context.totalDays}`);
  } else if (context.dayIndex != null) {
    parts.push(`Day ${context.dayIndex}`);
  }
  if (context.daysLeft != null) {
    parts.push(context.daysLeft === 0 ? "last day" : `${context.daysLeft} days left`);
  }
  parts.push(`${formatCurrency(context.totalSpent)} spent`);
  if (context.spentToday > 0) parts.push(`${formatCurrency(context.spentToday)} today`);

  return <>{parts.join(" · ")}</>;
}

function PlanningSummary({
  context,
}: {
  context: Extract<DashboardContext, { mode: "planning" }>;
}) {
  const parts: string[] = [];

  parts.push(
    context.startsInDays === 0
      ? "Starts today 🎉"
      : context.startsInDays === 1
        ? "Starts tomorrow"
        : `Starts in ${context.startsInDays} days`
  );
  parts.push(`${context.memberCount} ${context.memberCount === 1 ? "member" : "members"}`);
  if (context.perHead != null) parts.push(`~${formatCurrency(context.perHead)} each`);
  if (context.booked > 0) parts.push(`${formatCurrency(context.booked)} booked`);

  return <>{parts.join(" · ")}</>;
}
