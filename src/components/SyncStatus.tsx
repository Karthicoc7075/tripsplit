import { useEffect, useState } from "react";
import { CloudOff, TriangleAlert, UploadCloud } from "lucide-react";
import { useData } from "@/context/DataContext";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Problems get words; health gets a dot.
 *
 * A permanent "Synced 2m ago" reports the default state, so it reads as noise
 * and stops being seen — exactly when a real problem would be missed. Only the
 * states that need action carry text; the healthy state shrinks to a dot that
 * keeps the reassurance without competing with the logo and nav.
 */
export function SyncStatus({ className }: { className?: string }) {
  const { isOnline, error, loading, lastSyncedAt, retry, pendingCount } = useData();
  const [, tick] = useState(0);

  // Keeps the tooltip's "2m ago" honest on an idle screen.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!isOnline) {
    return (
      <span
        role="status"
        title="Your changes are saved on this device and will sync when you reconnect"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground",
          className
        )}
      >
        <CloudOff className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">
          {pendingCount > 0
            ? `Offline — ${pendingCount} waiting to sync`
            : "Offline — changes are saved here"}
        </span>
        <span className="sm:hidden">
          {pendingCount > 0 ? `Offline · ${pendingCount}` : "Offline"}
        </span>
      </span>
    );
  }

  if (error) {
    return (
      <button
        type="button"
        onClick={retry}
        title={error}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/15",
          className
        )}
      >
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Not syncing — retry</span>
        <span className="sm:hidden">Retry</span>
      </button>
    );
  }

  // Online but still flushing the offline queue — worth saying, since the
  // numbers on screen are already correct locally.
  if (pendingCount > 0) {
    return (
      <span
        role="status"
        title="Saved on this device — syncing to the server now"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground",
          className
        )}
      >
        <UploadCloud className="h-3.5 w-3.5 shrink-0 animate-pulse" />
        <span className="hidden sm:inline">Syncing {pendingCount}…</span>
        <span className="sm:hidden">{pendingCount}</span>
      </span>
    );
  }

  const syncing = loading || !lastSyncedAt;
  const label = syncing
    ? "Syncing…"
    : `Synced ${formatRelativeTime(lastSyncedAt)} — tap to refresh`;

  return (
    <button
      type="button"
      onClick={retry}
      title={label}
      aria-label={label}
      // Dot is 8px, but the button keeps a real tap target around it.
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          syncing ? "animate-pulse bg-amber-500" : "bg-success"
        )}
      />
    </button>
  );
}
