import { createContext, useContext, useEffect, useState } from "react";
import { type User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        const sessionKey = `session_start_${authUser.uid}`;
        const storedStart = localStorage.getItem(sessionKey);
        const now = Date.now();
        const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;

        if (storedStart) {
          const startTime = parseInt(storedStart, 10);
          if (now - startTime > threeMonthsMs) {
            localStorage.removeItem(sessionKey);
            void firebaseSignOut(auth).then(() => {
              setUser(null);
              setLoading(false);
            });
            return;
          }
        } else {
          localStorage.setItem(sessionKey, now.toString());
        }
      }
      setUser(authUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    if (user) {
      localStorage.removeItem(`session_start_${user.uid}`);
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
