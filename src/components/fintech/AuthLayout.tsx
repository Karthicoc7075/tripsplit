import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { isFirebaseConfigured } from "@/lib/firebase";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px]"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4"
          >
            <span className="text-xl font-bold text-primary">T</span>
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span style={{ color: "#276ACF" }}>Trip</span><span style={{ color: "#3AA91F" }}>Split</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Split bills, share memories.</p>
        </div>

        {!isFirebaseConfigured && (
          <div className="fintech-card border-destructive/30 bg-destructive/5 mb-6 p-4 flex gap-3 items-start text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Configuration required:</span> Add Firebase credentials to your <code className="text-xs bg-destructive/10 px-1 rounded">.env</code> file.
            </div>
          </div>
        )}

        <div className="fintech-card shadow-fintech-lg p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}