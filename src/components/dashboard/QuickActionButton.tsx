import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick: () => void;
  variant?: "primary" | "default";
}

export function QuickActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  variant = "default",
}: QuickActionButtonProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4 p-4 rounded-xl border transition-shadow text-center sm:text-left",
        variant === "primary"
          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25"
          : "fintech-card-hover bg-card border-border"
      )}
    >
      <div
        className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 mx-auto sm:mx-0",
          variant === "primary" ? "bg-white/15" : "bg-primary/10"
        )}
      >
        <Icon className={cn("h-5 w-5", variant === "primary" ? "text-primary-foreground" : "text-primary")} />
      </div>
      <div className="min-w-0 w-full sm:w-auto">
        <p className={cn("font-semibold text-sm", variant === "primary" ? "text-primary-foreground" : "text-foreground")}>
          {label}
        </p>
        {description && (
          <p className={cn("text-xs mt-0.5", variant === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")}>
            {description}
          </p>
        )}
      </div>
    </motion.button>
  );
}