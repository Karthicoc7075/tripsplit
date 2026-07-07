import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AuthErrorAlertProps {
  title?: string;
  message: string | null;
  action?: ReactNode;
}

export function AuthErrorAlert({ title = "Something went wrong", message, action }: AuthErrorAlertProps) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          initial={{ height: 0, opacity: 0, marginBottom: 0 }}
          animate={{ height: "auto", opacity: 1, marginBottom: 24 }}
          exit={{ height: 0, opacity: 0, marginBottom: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 flex gap-3 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs mt-0.5 opacity-90 leading-relaxed break-words">{message}</p>
              {action && <div className="mt-2">{action}</div>}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}