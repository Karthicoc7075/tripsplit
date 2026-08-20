import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";

interface AuthSplitShellProps {
  children: ReactNode;
}

/**
 * Two-column auth layout: brand story on the left, form on the right. Below
 * lg the brand panel drops out and the form centres on its own.
 */
export function AuthSplitShell({ children }: AuthSplitShellProps) {
  return (
    <div className="auth-page-bg min-h-screen w-full lg:grid lg:grid-cols-2 xl:grid-cols-[1.05fr_1fr]">
      <AuthBrandPanel />

      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:min-h-0 lg:px-10 xl:px-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px]"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
