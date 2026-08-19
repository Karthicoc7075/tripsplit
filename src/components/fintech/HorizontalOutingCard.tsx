import { Link } from "react-router-dom";
import { Calendar, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { getCategoryColor, type Outing } from "@/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface HorizontalOutingCardProps {
  outing: Outing;
  totalSpent: number;
  yourShare: number;
}

export function HorizontalOutingCard({ outing, totalSpent, yourShare }: HorizontalOutingCardProps) {
  const borderColor = getCategoryColor(outing.category);
  const progress = outing.status === "settled" ? 100 : Math.min((totalSpent / 50000) * 100, 95);
  const isOwed = yourShare > 0;
  const isOwing = yourShare < 0;

  return (
    <Link to={`/outings/${outing.id}`}>
      <div className="fintech-card-hover flex items-center gap-4 p-4 group">
        <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: borderColor }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {outing.name}
            </h3>
            <span className="text-sm font-medium text-foreground shrink-0">{formatCurrency(totalSpent)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{outing.date}</span>
            <span className="capitalize">{outing.category}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex -space-x-1.5">
              {outing.members.slice(0, 3).map((m) => (
                <Avatar key={m.id} className="h-6 w-6 border-2 border-card">
                  <AvatarFallback seed={m.id} className="text-[9px] bg-primary/10 text-primary">{m.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div className="flex items-center gap-3 flex-1 max-w-[200px]">
              <Progress value={progress} className="h-1 flex-1" />
              <span
                className={cn(
                  "text-xs font-medium shrink-0",
                  isOwed && "text-success",
                  isOwing && "text-destructive",
                  !isOwed && !isOwing && "text-muted-foreground"
                )}
              >
                {isOwed ? `+${formatCurrency(yourShare)}` : isOwing ? formatCurrency(Math.abs(yourShare)) : "Settled"}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </div>
        </div>
      </div>
    </Link>
  );
}