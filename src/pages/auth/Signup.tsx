import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { createUserProfile } from "@/lib/firestore";
import {
  getFirebaseAuthErrorCode,
  getFirebaseAuthErrorMessage,
  getAuthErrorTitle,
} from "@/lib/authErrors";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthBrandHeader } from "@/components/auth/AuthBrandHeader";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthFloatingField } from "@/components/auth/AuthFloatingField";
import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { AuthCheckbox } from "@/components/auth/AuthCheckbox";
import { AuthFooterLink } from "@/components/auth/AuthFooterLink";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

const fieldVariants = {
  hidden: { y: 12, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 120, damping: 18 } },
};

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setError("Firebase configuration is missing. Please check your .env file.");
    }
  }, []);

  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setConfirmError("Passwords do not match");
    } else {
      setConfirmError(null);
    }
  }, [password, confirmPassword]);

  const isFormValid =
    name.trim() &&
    email.trim() &&
    password.length >= 6 &&
    confirmPassword &&
    password === confirmPassword &&
    agreeTerms &&
    !loading;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    if (!isFirebaseConfigured) {
      setError("Please configure your .env file with correct Firebase credentials.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreeTerms) {
      setError("You must agree to the Terms & Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      // Firebase Auth will automatically throw 'auth/email-already-in-use' if it exists.

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      await createUserProfile(userCredential.user.uid, { name, email });
      setIsSuccess(true);
      toast.success("Account created! Let's start splitting expenses.");
      setTimeout(() => navigate("/dashboard"), 1600);
    } catch (err: unknown) {
      const code = getFirebaseAuthErrorCode(err);
      setErrorCode(code);
      setError(getFirebaseAuthErrorMessage(err, "signup"));
      setLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div key="signup" exit={{ opacity: 0, scale: 0.98 }}>
            <AuthBrandHeader
              title="Create your account"
              subtitle="Start tracking outings with your friends"
            />

            <AuthCard footer={<AuthFooterLink text="Already have an account?" linkText="Sign in" to="/login" />}>
              <AuthErrorAlert
                title={getAuthErrorTitle(errorCode, "signup")}
                message={error}
                action={
                  errorCode === "auth/email-already-in-use" ? (
                    <Link
                      to="/login"
                      className="text-xs font-semibold underline hover:no-underline"
                    >
                      Sign in to your account →
                    </Link>
                  ) : undefined
                }
              />

              <motion.form
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                onSubmit={handleSignup}
                className="space-y-4"
              >
                <motion.div variants={fieldVariants}>
                  <AuthFloatingField
                    label="Full Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </motion.div>

                <motion.div variants={fieldVariants}>
                  <AuthFloatingField
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </motion.div>

                <motion.div variants={fieldVariants} className="space-y-2">
                  <AuthFloatingField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    showToggle
                    isVisible={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                  />
                  <PasswordStrength password={password} />
                </motion.div>

                <motion.div variants={fieldVariants}>
                  <AuthFloatingField
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    error={confirmError ?? undefined}
                  />
                </motion.div>

                <motion.div variants={fieldVariants} className="pt-1">
                  <AuthCheckbox checked={agreeTerms} onChange={setAgreeTerms}>
                    I agree to the{" "}
                    <a href="/terms" className="text-primary hover:underline font-medium">Terms of Service</a>
                    {" "}and{" "}
                    <a href="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</a>
                  </AuthCheckbox>
                </motion.div>

                <motion.div variants={fieldVariants} className="pt-2">
                  <AuthSubmitButton
                    loading={loading}
                    loadingText="Creating account..."
                    disabled={!isFormValid}
                  >
                    Create Account
                  </AuthSubmitButton>
                </motion.div>
              </motion.form>
            </AuthCard>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <AuthCard>
              <div className="text-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 140 }}
                  className="h-16 w-16 mx-auto bg-success/15 border border-success/30 rounded-full flex items-center justify-center mb-6"
                >
                  <CheckCircle2 className="h-9 w-9 text-success" />
                </motion.div>
                <motion.h2
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="text-2xl font-semibold text-foreground"
                >
                  Account Created!
                </motion.h2>
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-sm text-muted-foreground mt-2"
                >
                  Setting up your workspace… Redirecting now.
                </motion.p>
              </div>
            </AuthCard>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthPageShell>
  );
}