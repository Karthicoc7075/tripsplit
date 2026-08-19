import { X } from "lucide-react";
import { DEFAULT_FILTERS, type ReportFilters } from "@/lib/reportFilters";
import { cn } from "@/lib/utils";

interface ActiveFilterBarProps {
  filters: ReportFilters;
  memberName?: string;
  onChange: (patch: Partial<ReportFilters>) => void;
  onClear: () => void;
  className?: string;
}

interface Chip {
  key: keyof ReportFilters;
  label: string;
  value: string;
  reset: Partial<ReportFilters>;
}

/**
 * The filters live in one object shared by every tab, so they must stay visible
 * on every tab. Without this, narrowing on Memories would silently reshape the
 * Insights charts and Friends balances with nothing on screen explaining why.
 */
export function ActiveFilterBar({
  filters,
  memberName,
  onChange,
  onClear,
  className,
}: ActiveFilterBarProps) {
  const chips: Chip[] = [];

  if (filters.query.trim()) {
    chips.push({
      key: "query",
      label: "Search",
      value: `"${filters.query.trim()}"`,
      reset: { query: "" },
    });
  }
  if (filters.year !== DEFAULT_FILTERS.year) {
    chips.push({ key: "year", label: "Year", value: filters.year, reset: { year: DEFAULT_FILTERS.year } });
  }
  if (filters.category !== DEFAULT_FILTERS.category) {
    chips.push({
      key: "category",
      label: "Category",
      value: filters.category,
      reset: { category: DEFAULT_FILTERS.category },
    });
  }
  if (filters.memberId !== DEFAULT_FILTERS.memberId) {
    chips.push({
      key: "memberId",
      label: "With",
      value: memberName ?? "member",
      reset: { memberId: DEFAULT_FILTERS.memberId },
    });
  }
  if (filters.includeArchived) {
    chips.push({
      key: "includeArchived",
      label: "Including",
      value: "archived",
      reset: { includeArchived: false },
    });
  }

  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2",
        className
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">Filtered by</span>

      {chips.map((chip) => (
        <span
          key={String(chip.key)}
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2 py-1 text-xs"
        >
          <span className="shrink-0 text-muted-foreground">{chip.label}</span>
          <span className="truncate font-semibold text-foreground">{chip.value}</span>
          <button
            type="button"
            onClick={() => onChange(chip.reset)}
            aria-label={`Remove ${chip.label} filter`}
            className="shrink-0 rounded text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClear}
        className="ml-auto shrink-0 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
