import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Receipt, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { getCategoryColor, type Outing } from "@/types";
import { formatCurrency } from "@/lib/format";
import { formatOutingDates, isOutingCreator } from "@/lib/outing";
import { getFirstName, formatPersonOwes, formatPersonIsOwed } from "@/lib/displayNames";
import { cn } from "@/lib/utils";

interface OutingCardProps {
  outing: Outing;
  totalSpent: number;
  yourShare: number;
  transactionCount: number;
  currentUserId: string;
  currentUserName: string;
  index?: number;
}

const STATUS_LABELS: Record<Outing["status"], string> = {
  ongoing: "Active",
  settled: "Completed",
  planned: "Planned",
};

export function OutingCard({
  outing,
  totalSpent,
  yourShare,
  transactionCount,
  currentUserId,
  currentUserName,
  index = 0,
}: OutingCardProps) {
  const firstName = getFirstName(currentUserName);
  const isCreator = isOutingCreator(outing, currentUserId);
  const accent = getCategoryColor(outing.category);
  const dates = formatOutingDates(outing);
  const hasBudget = outing.budget != null && outing.budget > 0;
  const budgetProgress = hasBudget
    ? Math.min((totalSpent / outing.budget!) * 100, 100)
    : 0;
  const isOwed = yourShare > 0;
  const isOwing = yourShare < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      layout
    >
      <Link to={`/outings/${outing.id}`}>
        <div className="fintech-card-hover overflow-hidden group h-full flex">
          {/* Accent left bar */}
          <div className="w-1 shrink-0 rounded-l-xl" style={{ backgroundColor: accent }} />

          <div className="flex-1 p-4 sm:p-5 min-w-0">
            {/* Header: title + badges */}
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex  gap-2 items-center min-w-0">
                <h3 className="font-bold text-lg leading-snug text-primary capitalize group-hover:text-primary/80 transition-colors line-clamp-2 flex-1">
                {outing.name}
              </h3>
              <Badge
                  className="text-[10px] font-semibold border-0 px-3 py-0.5  capitalize"
                  style={{ backgroundColor: accent  }}
                >
                  {outing.category}
                </Badge>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                
                <Badge
                  variant={outing.status === "ongoing" ? "default" : "secondary"}
                  className="text-[10px] capitalize px-2 py-0.5"
                >
                  {STATUS_LABELS[outing.status]}
                </Badge>
              </div>
            </div>

            {/* Creator subtitle */}
            <p className="text-[11px] text-muted-foreground mb-3">
              {isCreator
                ? `Created by ${firstName}`
                : `${firstName} is in this outing`}
            </p>

            {/* Date & Location */}
            <div className="space-y-1 mb-3">
              {dates && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 shrink-0 text-primary/60" />
                  {dates}
                </p>
              )}
              {outing.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                  <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
                  {outing.location}
                </p>
              )}
            </div>

            {/* Budget progress */}
            {hasBudget && (
              <div className="mb-3">
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                  <span>Budget</span>
                  <span className={cn(budgetProgress >= 90 ? "text-destructive" : "text-foreground/70")}>
                    {formatCurrency(totalSpent)} / {formatCurrency(outing.budget!)}
                  </span>
                </div>
                <Progress value={budgetProgress} className="h-1.5" />
              </div>
            )}

            {/* Members + txn count */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex -space-x-2">
                {outing.members.slice(0, 4).map((m, i) => (
                  <Avatar key={m.id} className="h-6 w-6 border-2 border-card" style={{ zIndex: 4 - i }}>
                    <AvatarFallback seed={m.id} className="bg-primary/10 text-primary text-[9px] font-semibold">{m.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {outing.members.length > 4 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                    +{outing.members.length - 4}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Receipt className="h-3 w-3" />
                {transactionCount} txns
              </div>
            </div>

            {/* Footer: balance + total */}
            <div className="pt-3 border-t border-border/40 flex justify-between items-center">
              <span
                className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-full",
                  isOwed && "fintech-pill-owed",
                  isOwing && "fintech-pill-owe",
                  !isOwed && !isOwing && "fintech-pill-settled"
                )}
              >
                {isOwed
                  ? formatPersonIsOwed(currentUserName, yourShare)
                  : isOwing
                  ? formatPersonOwes(currentUserName, Math.abs(yourShare))
                  : "All settled"}
              </span>
              <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                {formatCurrency(totalSpent)}
                <ArrowRight className="h-4 w-4 text-primary/50 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}