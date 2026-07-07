type AuthContext = "signup" | "login" | "reset";

interface FirebaseAuthErrorLike {
  code?: string;
  message?: string;
}

export function getFirebaseAuthErrorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as FirebaseAuthErrorLike).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

const MESSAGES: Record<AuthContext, Record<string, string>> = {
  signup: {
    "auth/email-already-in-use":
      "This email is already registered. Please sign in or use a different email.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/operation-not-allowed": "Email sign-up is not enabled. Contact support.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
  },
  login: {
    "auth/invalid-credential": "Incorrect email or password. Please try again.",
    "auth/wrong-password": "Incorrect email or password. Please try again.",
    "auth/user-not-found": "No account found with this email. Create an account first.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
  },
  reset: {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "No account found with this email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
  },
};

const DEFAULT_MESSAGES: Record<AuthContext, string> = {
  signup: "Could not create your account. Please check your details and try again.",
  login: "Unable to sign in. Please verify your email and password.",
  reset: "Could not send the reset email. Please try again.",
};

export function getFirebaseAuthErrorMessage(error: unknown, context: AuthContext): string {
  const code = getFirebaseAuthErrorCode(error);
  if (code && MESSAGES[context][code]) {
    return MESSAGES[context][code];
  }
  if (error instanceof Error && error.message && !error.message.startsWith("Firebase:")) {
    return error.message;
  }
  return DEFAULT_MESSAGES[context];
}

export function getAuthErrorTitle(code: string | null, context: AuthContext): string {
  if (code === "auth/email-already-in-use" && context === "signup") {
    return "Account already exists";
  }
  if (code === "auth/user-not-found" && context === "login") {
    return "Account not found";
  }
  if (context === "signup") return "Could not create account";
  if (context === "login") return "Unable to sign in";
  return "Something went wrong";
}