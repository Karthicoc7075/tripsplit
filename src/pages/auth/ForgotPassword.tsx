import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import {
  getFirebaseAuthErrorCode,
  getFirebaseAuthErrorMessage,
  getAuthErrorTitle,
} from "@/lib/authErrors";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthBrandHeader } from "@/components/auth/AuthBrandHeader";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthFloatingField } from "@/components/auth/AuthFloatingField";
import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { AuthFooterLink } from "@/components/auth/AuthFooterLink";
import emailImg from "@/assets/email.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setError("Firebase configuration is missing. Please check your .env file.");
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    if (!isFirebaseConfigured) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setIsSent(true);
      toast.success("Password reset link sent! Check your inbox.");
    } catch (err: unknown) {
      const code = getFirebaseAuthErrorCode(err);
      setErrorCode(code);
      setError(getFirebaseAuthErrorMessage(err, "reset"));
      setLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <AnimatePresence mode="wait">
        {!isSent ? (
          <motion.div key="forgot" exit={{ opacity: 0, scale: 0.98 }}>
            <AuthBrandHeader
              title="Reset your password"
              subtitle="Enter your email and we'll send you a secure reset link"
            />

            <AuthCard footer={<AuthFooterLink text="Remember your password?" linkText="Sign in" to="/login" />}>
              <AuthErrorAlert
                message={error}
                title={getAuthErrorTitle(errorCode, "reset")}
              />

              <form onSubmit={handleReset} className="space-y-4">
                <AuthFloatingField
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />

                <AuthSubmitButton loading={loading}>
                  Send Reset Link
                </AuthSubmitButton>
              </form>
            </AuthCard>
          </motion.div>
        ) : (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <AuthCard>
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6 flex justify-center"
                >
                  <img src={emailImg} alt="Email Sent" className="h-28 w-28 object-contain" />
                </motion.div>
                <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  We've sent a password reset link to{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
                <Button variant="outline" asChild className="w-full h-12 rounded-xl mt-8">
                  <Link to="/login">Return to login</Link>
                </Button>
              </div>
            </AuthCard>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthPageShell>
  );
}