import { Link } from "react-router-dom";
import { Check, UserPlus, Map, Receipt, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FirstRunPanelProps {
  hasFriends: boolean;
  hasOutings: boolean;
  hasExpenses: boolean;
  name: string;
}

/**
 * Replaces the five stacked empty boxes a brand-new account used to see with a
 * single path forward. Disappears for good once the first expense is logged.
 */
export function FirstRunPanel({
  hasFriends,
  hasOutings,
  hasExpenses,
  name,
}: FirstRunPanelProps) {
  const steps = [
    {
      done: hasFriends,
      icon: UserPlus,
      title: "Add a friend",
      description: "Find people you split costs with.",
      to: "/friends",
      cta: "Add friend",
    },
    {
      done: hasOutings,
      icon: Map,
      title: "Create an outing",
      description: "A trip, a dinner, a movie — anything shared.",
      to: "/outings",
      cta: "Create outing",
    },
    {
      done: hasExpenses,
      icon: Receipt,
      title: "Log an expense",
      description: "We work out who owes whom from there.",
      to: "/outings",
      cta: "Log expense",
    },
  ];

  const next = steps.find((s) => !s.done);
  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="fintech-card p-5 sm:p-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Welcome to TripSplit, {name} 👋
        </h2>
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {completed} of {steps.length}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Three steps and your first split is done.
      </p>

      <ol className="mt-4 space-y-2">
        {steps.map((step) => {
          const isNext = step === next;
          const Icon = step.icon;

          return (
            <li key={step.title}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                  step.done && "border-success/30 bg-success/5",
                  isNext && "border-primary/40 bg-primary/5",
                  !step.done && !isNext && "border-border/50"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    step.done
                      ? "bg-success/15 text-success"
                      : isNext
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {step.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      step.done ? "text-muted-foreground line-through" : "text-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  {!step.done && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                  )}
                </div>

                {isNext && (
                  <Link
                    to={step.to}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    {step.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
