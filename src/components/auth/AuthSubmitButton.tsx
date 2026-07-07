import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AuthSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function AuthSubmitButton({
  loading,
  loadingText = "Please wait...",
  children,
  disabled,
  className,
  ...props
}: AuthSubmitButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.div whileHover={!isDisabled ? { scale: 1.01 } : {}} whileTap={!isDisabled ? { scale: 0.99 } : {}}>
      <button
        type="submit"
        disabled={isDisabled}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200",
          isDisabled
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25",
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText}</span>
          </>
        ) : (
          children
        )}
      </button>
    </motion.div>
  );
}