import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface AuthPageShellProps {
  children: ReactNode;
  maxWidth?: "sm" | "md";
}

export function AuthPageShell({ children, maxWidth = "sm" }: AuthPageShellProps) {
  return (
    <div className="auth-page-bg min-h-screen flex items-center justify-center px-4 py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={`w-full ${maxWidth === "md" ? "max-w-[480px]" : "max-w-[440px]"}`}
      >
        {children}
      </motion.div>
    </div>
  );
}