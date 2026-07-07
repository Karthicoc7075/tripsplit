import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OutingStatus } from "@/types";

interface OutingStatusToggleProps {
  status: OutingStatus;
  onChange: (status: "ongoing" | "settled") => void;
}

export function OutingStatusToggle({ status, onChange }: OutingStatusToggleProps) {
  const isActive = status === "ongoing" || status === "planned";

  return (
    <div className="inline-flex items-center p-1 rounded-xl bg-muted/50 border border-border/60 gap-0.5">
      <button
        type="button"
        onClick={() => onChange("ongoing")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Circle className={cn("h-3 w-3", isActive && "fill-primary-foreground/30")} />
        Active
      </button>
      <button
        type="button"
        onClick={() => onChange("settled")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
          status === "settled"
            ? "bg-muted-foreground/20 text-foreground shadow-sm border border-border/60"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <CheckCircle2 className="h-3 w-3" />
        Done
      </button>
    </div>
  );
}