import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function AuthCheckbox({ checked, onChange, children, className }: AuthCheckboxProps) {
  return (
    <label className={cn("flex items-start gap-2.5 cursor-pointer select-none group", className)}>
      <div className="relative flex items-center justify-center mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={cn(
            "h-[18px] w-[18px] border rounded-md transition-all duration-200 flex items-center justify-center",
            checked ? "border-primary bg-primary" : "border-border bg-surface-input group-hover:border-primary/50"
          )}
        >
          {checked && <Check className="h-3 w-3 text-primary-foreground stroke-[3px]" />}
        </div>
      </div>
      <span className="text-xs text-muted-foreground group-hover:text-foreground leading-relaxed transition-colors">
        {children}
      </span>
    </label>
  );
}