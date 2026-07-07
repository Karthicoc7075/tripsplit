import { cn } from "@/lib/utils";

interface FilterChipsProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  className,
}: FilterChipsProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 shrink-0",
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}