import { useState } from "react";
import { cn } from "@/lib/utils";

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FloatingInput({ label, className, id, value, ...props }: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== "";
  const inputId = id ?? label.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="relative">
      <input
        id={inputId}
        value={value}
        className={cn(
          "peer w-full h-12 px-4 pt-4 pb-1 rounded-lg border border-border/80 bg-card text-foreground text-sm",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200",
          "placeholder-transparent",
          className
        )}
        placeholder={label}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "absolute left-4 transition-all duration-200 pointer-events-none text-muted-foreground",
          focused || hasValue
            ? "top-1.5 text-[10px] font-medium uppercase tracking-wider"
            : "top-1/2 -translate-y-1/2 text-sm",
          (focused || hasValue) && "text-primary"
        )}
      >
        {label}
      </label>
    </div>
  );
}