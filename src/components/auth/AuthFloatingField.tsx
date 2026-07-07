import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthFloatingFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  showToggle?: boolean;
  onToggle?: () => void;
  isVisible?: boolean;
  error?: string;
}

export function AuthFloatingField({
  label,
  showToggle,
  onToggle,
  isVisible,
  error,
  className,
  id,
  ...props
}: AuthFloatingFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1">
      <div className="relative group">
        <input
          id={fieldId}
          placeholder=" "
          className={cn(
            "auth-input peer w-full px-4 pt-6 pb-2.5 rounded-xl border text-sm",
            "transition-all duration-200 placeholder-transparent",
            "hover:border-border focus:outline-none",
            showToggle && "pr-12",
            error && "border-destructive/60 focus:border-destructive focus:ring-destructive/15",
            className
          )}
          {...props}
        />
        <label
          htmlFor={fieldId}
          className={cn(
            "absolute left-4 transition-all duration-200 pointer-events-none font-medium text-muted-foreground",
            "peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm",
            "peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-primary",
            "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px]"
          )}
        >
          {label}
        </label>
        {showToggle && (
          <button
            type="button"
            tabIndex={-1}
            onClick={onToggle}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={isVisible ? "Hide password" : "Show password"}
          >
            {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-destructive px-1">{error}</p>}
    </div>
  );
}