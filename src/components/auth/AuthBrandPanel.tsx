import { motion } from "framer-motion";
import { Users, Calculator, Wallet } from "lucide-react";
import { AuthWordmark } from "@/components/auth/AuthWordmark";

const features = [
  {
    icon: Users,
    title: "Split however you need",
    body: "Equally, by exact amounts, or by percentage — per expense.",
  },
  {
    icon: Calculator,
    title: "Balances keep themselves",
    body: "Every expense updates who owes whom, the moment it lands.",
  },
  {
    icon: Wallet,
    title: "Settle in the fewest payments",
    body: "Debts are simplified down to the shortest list of transfers.",
  },
];

/**
 * The marketing half of the auth screens. Hidden below lg, where the form
 * takes the whole width and the pitch would just push it below the fold.
 */
export function AuthBrandPanel() {
  return (
    <aside className="auth-brand-panel relative hidden flex-col justify-between overflow-hidden p-10 xl:p-14 lg:flex">
      <div className="auth-brand-glow" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative"
      >
        <AuthWordmark size="lg" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative my-12 max-w-md"
      >
        <h2 className="text-[2.1rem] font-bold leading-[1.12] tracking-tight text-foreground xl:text-[2.5rem]">
          Shared trips,
          <br />
          settled fairly.
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          Track what everyone paid on the way, and let TripSplit work out who
          owes what when you get home.
        </p>

        <ul className="mt-10 space-y-5">
          {features.map(({ icon: Icon, title, body }, i) => (
            <motion.li
              key={title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
              className="flex gap-3.5"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">
                  {body}
                </span>
              </span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      <p className="relative text-xs text-muted-foreground">
        © {new Date().getFullYear()} TripSplit
      </p>
    </aside>
  );
}
