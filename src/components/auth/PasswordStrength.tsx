import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type PasswordStrengthLevel = "weak" | "medium" | "strong" | "";

export function getPasswordStrength(password: string): PasswordStrengthLevel {
  if (!password) return "";
  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) && password.length >= 8) score++;
  if (score === 1) return "weak";
  if (score === 2) return "medium";
  return "strong";
}

const config = {
  weak: { width: "w-1/3", color: "bg-destructive", text: "text-destructive" },
  medium: { width: "w-2/3", color: "bg-accent", text: "text-accent" },
  strong: { width: "w-full", color: "bg-success", text: "text-success" },
};

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = getPasswordStrength(password);
  const cfg = strength ? config[strength] : null;

  return (
    <AnimatePresence>
      {password && cfg && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-1.5 px-0.5 overflow-hidden"
        >
          <div className="h-1 w-full bg-border/60 dark:bg-border rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: strength === "weak" ? "33%" : strength === "medium" ? "66%" : "100%" }}
              transition={{ duration: 0.3 }}
              className={cn("h-full rounded-full", cfg.color)}
            />
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-muted-foreground">Password strength</span>
            <span className={cn("font-semibold capitalize", cfg.text)}>{strength}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}