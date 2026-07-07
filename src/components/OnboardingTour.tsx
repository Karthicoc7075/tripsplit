import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const steps = [
  {
    icon: Map,
    title: "Create Outings",
    description: "Start a group for trips, dinners, or shared expenses. Invite friends and track everything in one place.",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const ONBOARDING_KEY = user ? `tripsplit-onboarding-${user.uid}` : "tripsplit-onboarding-complete";

  useEffect(() => {
    if (!user) return;
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      const timer = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, ONBOARDING_KEY]);

  const complete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setOpen(false);
  };

  const current = steps[0];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="bg-card border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-1">
                  <div className="h-1.5 rounded-full transition-all w-6 bg-primary" />
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1 -mt-1" onClick={complete}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center"
              >
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">{current.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{current.description}</p>
              </motion.div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <Button className="flex-1" onClick={complete}>
                Get Started
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}