import { Link } from "react-router-dom";
import { Pin, Users, MapPin, Receipt } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { getOutingStatusLabel } from "@/lib/outing";
import { getOutingMembers } from "@/lib/members";
import { getCategoryColor } from "@/types";
import type { OutingMemory } from "@/lib/reportFilters";
import { cn } from "@/lib/utils";

interface OutingMemoryCardProps {
  memory: OutingMemory;
  onTogglePin?: (outingId: string, pinned: boolean) => void;
  className?: string;
}

function formatRange(memory: OutingMemory): string {
  const { outing } = memory;
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  if (outing.startDate) {
    const start = new Date(outing.startDate);
    const end = outing.endDate ? new Date(outing.endDate) : null;
    if (!Number.isNaN(start.getTime())) {
      const year = start.getFullYear();
      if (end && !Number.isNaN(end.getTime()) && end.getTime() !== start.getTime()) {
        return `${fmt(start)} – ${fmt(end)} ${year}`;
      }
      return `${fmt(start)} ${year}`;
    }
  }
  const created = new Date(outing.createdAt);
  return Number.isNaN(created.getTime())
    ? ""
    : `${fmt(created)} ${created.getFullYear()}`;
}

/**
 * One outing, told as a memory: what it was, who was there, what it cost, and
 * where the money went — without having to open it. Shared by the Reports
 * timeline and search results so there is only ever one card to style.
 */
export function OutingMemoryCard({
  memory,
  onTogglePin,
  className,
}: OutingMemoryCardProps) {
  const { outing, totalSpent, yourSpent, yourShare, net, transactionCount } = memory;
  const members = getOutingMembers(outing);
  const accent = getCategoryColor(outing.category);
  const owes = net < -0.01;
  const getsBack = net > 0.01;
  const topMix = memory.categoryMix.slice(0, 3);

  return (
    <div
      className={cn(
        "fintech-card relative overflow-hidden transition-colors hover:border-primary/40",
        className
      )}
    >
      {/* Category stripe — the outing's visual identity at a glance. */}
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: accent }}
        aria-hidden
      />

      {onTogglePin && (
        <button
          type="button"
          onClick={() => onTogglePin(outing.id, !outing.pinned)}
          aria-label={outing.pinned ? "Unpin outing" : "Pin outing"}
          aria-pressed={!!outing.pinned}
          className={cn(
            "absolute right-3 top-3 z-10 rounded-lg p-1.5 transition-colors",
            outing.pinned
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground/50 hover:bg-muted hover:text-foreground"
          )}
        >
          <Pin className={cn("h-4 w-4", outing.pinned && "fill-current")} />
        </button>
      )}

      <Link to={`/outings/${outing.id}`} className="block pl-5 pr-12 py-4 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{outing.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{formatRange(memory)}</span>
              {outing.location && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="inline-flex items-center gap-1 truncate max-w-[10rem]">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {outing.location}
                  </span>
                </>
              )}
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {members.length}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1">
                <Receipt className="h-3 w-3" />
                {transactionCount}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-lg sm:text-xl font-semibold tabular-nums text-foreground">
              {formatCurrency(totalSpent)}
            </p>
            <Badge
              variant={
                outing.status === "settled"
                  ? "secondary"
                  : outing.status === "planned"
                    ? "outline"
                    : "default"
              }
              className="mt-1"
            >
              {getOutingStatusLabel(outing.status)}
            </Badge>
          </div>
        </div>

        {/* Your money in this outing. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-muted-foreground">
            You spent{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatCurrency(yourSpent)}
            </span>
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground">
            share{" "}
            <span className="font-semibold tabular-nums">{formatCurrency(yourShare)}</span>
          </span>
          {(owes || getsBack) && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  owes ? "text-destructive" : "text-success"
                )}
              >
                {owes
                  ? `-${formatCurrency(Math.abs(net))} to pay`
                  : `+${formatCurrency(net)} coming back`}
              </span>
            </>
          )}
        </div>

        {/* Where the money went, for this outing alone. */}
        {topMix.length > 0 && (
          <div className="mt-3">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
              {memory.categoryMix.map((c) => (
                <div
                  key={c.name}
                  style={{ width: `${c.percent}%`, backgroundColor: getCategoryColor(c.name) }}
                  title={`${c.name} ${c.percent}%`}
                />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground truncate">
              {topMix.map((c) => `${c.name} ${c.percent}%`).join(" · ")}
            </p>
          </div>
        )}

        {outing.note && (
          <p className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs italic text-muted-foreground">
            {outing.note}
          </p>
        )}

        {(outing.tags?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {outing.tags!.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((m) => (
              <Avatar key={m.id} className="h-6 w-6 border-2 border-card">
                <AvatarFallback seed={m.id} className="text-[10px] font-semibold">{m.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
            {members.length > 5 && (
              <span className="flex h-6 items-center rounded-full border-2 border-card bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                +{members.length - 5}
              </span>
            )}
          </div>

          {memory.receiptUrls.length > 0 && (
            <div className="flex -space-x-1.5">
              {memory.receiptUrls.map((url, i) => (
                <img
                  key={`${url}-${i}`}
                  src={url}
                  alt=""
                  loading="lazy"
                  className="h-8 w-8 rounded-md border-2 border-card object-cover"
                />
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
