import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "primary" | "success" | "destructive" | "accent";
  accentBar?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  prefix = "",
  suffix = "",
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  accentBar = true,
  onClick,
  className,
}: StatCardProps) {
  const valueColor = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-success",
    destructive: "text-destructive",
    accent: "text-accent",
  }[variant];

  const barColor = {
    default: "bg-primary",
    primary: "bg-primary",
    success: "bg-success",
    destructive: "bg-destructive",
    accent: "bg-accent",
  }[variant];

  // A clickable card is a real button: focusable, Enter/Space activated, and
  // announced as a control. A bare <div onClick> is mouse-only.
  const Root = onClick ? "button" : "div";

  return (
    <Root
      {...(onClick
        ? { type: "button" as const, onClick, "aria-label": `${title}. ${subtitle ?? ""}`.trim() }
        : {})}
      className={cn(
        // `w-full` is load-bearing: form controls size to fit-content even with
        // display:flex, so a clickable card would render narrower than its
        // plain-<div> siblings in the same grid row.
        "fintech-card-hover p-4 sm:p-5 relative overflow-hidden w-full min-w-0 h-full flex flex-col justify-between transition-all duration-200 text-left",
        onClick &&
          "cursor-pointer active:scale-[0.98] select-none hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      {accentBar && <div className={cn("absolute top-0 left-0 right-0 h-0.5", barColor)} />}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <span className="min-w-0 flex-1 truncate text-xs font-medium leading-tight text-muted-foreground sm:text-sm">
            {title}
          </span>
          {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/70 shrink-0" />}
        </div>
        <div
          className={cn(
            "text-xl font-semibold leading-tight tracking-tight tabular-nums break-words sm:text-2xl lg:text-[1.75rem]",
            valueColor
          )}
        >
          <CountUp value={value} prefix={prefix} suffix={suffix} />
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="mt-2.5 flex min-w-0 shrink-0 flex-wrap items-center gap-x-2 gap-y-1">
          {trend && (
            <span
              className={cn(
                "flex shrink-0 items-center gap-0.5 text-xs font-medium",
                trend.positive ? "text-success" : "text-destructive"
              )}
            >
              {trend.positive ? (
                <TrendingUp className="h-3 w-3 shrink-0" />
              ) : (
                <TrendingDown className="h-3 w-3 shrink-0" />
              )}
              {trend.value}
            </span>
          )}
          {subtitle && (
            <span className="min-w-0 text-xs leading-tight text-muted-foreground">{subtitle}</span>
          )}
        </div>
      )}
    </Root>
  );
}