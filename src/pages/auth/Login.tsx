import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import {
  getFirebaseAuthErrorCode,
  getFirebaseAuthErrorMessage,
  getAuthErrorTitle,
} from "@/lib/authErrors";
import { toast } from "sonner";
import { Users, Calculator, Wallet } from "lucide-react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthBrandHeader } from "@/components/auth/AuthBrandHeader";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthFloatingField } from "@/components/auth/AuthFloatingField";
import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { AuthCheckbox } from "@/components/auth/AuthCheckbox";
import { AuthFooterLink } from "@/components/auth/AuthFooterLink";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  // A returning user does not need the pitch — only show it to cold arrivals.
  const [rememberedEmail, setRememberedEmail] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setError("Firebase configuration is missing. Please check your .env file.");
    }
    const remembered = localStorage.getItem("tripsplit-remember-email");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
      setRememberedEmail(true);
    }
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    if (!isFirebaseConfigured) {
      setError("Please configure your .env file with correct Firebase credentials.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (rememberMe) {
        localStorage.setItem("tripsplit-remember-email", email);
      } else {
        localStorage.removeItem("tripsplit-remember-email");
      }
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: unknown) {
      const code = getFirebaseAuthErrorCode(err);
      setErrorCode(code);
      setError(getFirebaseAuthErrorMessage(err, "login"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <AuthBrandHeader
        title="Welcome back"
        subtitle="Sign in to continue managing your outings"
      />

      {/* One line on what this is, for anyone arriving cold. Hidden once they
          have signed in before, since it is then just noise. */}
      {!rememberedEmail && (
        <ul className="mb-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          {[
            { icon: Users, text: "Split with friends" },
            { icon: Calculator, text: "We do the maths" },
            { icon: Wallet, text: "Settle in one tap" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{text}</span>
            </li>
          ))}
        </ul>
      )}

      <AuthCard
        footer={<AuthFooterLink text="Don't have an account?" linkText="Create one" to="/signup" />}
      >
        <AuthErrorAlert
          title={getAuthErrorTitle(errorCode, "login")}
          message={error}
          action={
            errorCode === "auth/user-not-found" ? (
              <Link
                to="/signup"
                className="text-xs font-semibold underline hover:no-underline"
              >
                Create an account →
              </Link>
            ) : undefined
          }
        />

        <form onSubmit={handleEmailLogin} className="space-y-5">
          <AuthFloatingField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <AuthFloatingField
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            showToggle
            isVisible={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
          />

          <div className="flex items-center justify-between pt-0.5">
            <AuthCheckbox checked={rememberMe} onChange={setRememberMe}>
              Remember me
            </AuthCheckbox>
            <Link
              to="/forgot-password"
              className="text-xs text-primary font-medium hover:underline transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          <AuthSubmitButton loading={loading} loadingText="Signing in...">
            Sign In
          </AuthSubmitButton>
        </form>
      </AuthCard>
    </AuthPageShell>
  );
}