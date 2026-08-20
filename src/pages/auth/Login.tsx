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
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { AuthFloatingField } from "@/components/auth/AuthFloatingField";
import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { AuthCheckbox } from "@/components/auth/AuthCheckbox";

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
    <AuthSplitShell>
      <AuthHeading
        title="Welcome back"
        subtitle="Sign in to pick up your outings where you left off."
      />

      {/* The brand panel carries the pitch on desktop; this is the small-screen
          stand-in, and only for people who have not signed in here before. */}
      {!rememberedEmail && (
        <ul className="mb-7 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground lg:hidden">
          {[
            { icon: Users, text: "Split with friends" },
            { icon: Calculator, text: "We do the maths" },
            { icon: Wallet, text: "Settle in one tap" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      )}

      <AuthErrorAlert
        title={getAuthErrorTitle(errorCode, "login")}
        message={error}
        action={
          errorCode === "auth/user-not-found" ? (
            <Link to="/signup" className="text-xs font-semibold underline hover:no-underline">
              Create an account →
            </Link>
          ) : undefined
        }
      />

      <form onSubmit={handleEmailLogin} className="space-y-4">
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

        <div className="flex items-center justify-between gap-3 pt-0.5">
          <AuthCheckbox checked={rememberMe} onChange={setRememberMe}>
            Remember me
          </AuthCheckbox>
          <Link
            to="/forgot-password"
            className="shrink-0 text-xs font-medium text-primary transition-colors hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <div className="pt-2">
          <AuthSubmitButton loading={loading} loadingText="Signing in...">
            Sign In
          </AuthSubmitButton>
        </div>
      </form>

      <p className="mt-8 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/signup" className="font-semibold text-primary hover:underline">
          Create one
        </Link>
      </p>
    </AuthSplitShell>
  );
}
