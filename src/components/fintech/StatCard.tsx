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

  return (
    <div
      onClick={onClick}
      className={cn(
        "fintech-card-hover p-4 sm:p-5 relative overflow-hidden min-w-0 h-full flex flex-col justify-between transition-all duration-200",
        onClick && "cursor-pointer active:scale-[0.98] select-none hover:border-primary/40",
        className
      )}
    >
      {accentBar && <div className={cn("absolute top-0 left-0 right-0 h-0.5", barColor)} />}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">{title}</span>
          {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/70 shrink-0" />}
        </div>
        <div className={cn("text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight truncate", valueColor)}>
          <CountUp value={value} prefix={prefix} suffix={suffix} />
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="mt-2.5 flex items-center gap-2 shrink-0">
          {trend && (
            <span className={cn("text-xs font-medium flex items-center gap-0.5", trend.positive ? "text-success" : "text-destructive")}>
              {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend.value}
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}