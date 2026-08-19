import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCategoryColor, type Outing } from "@/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface UpcomingOutingChipProps {
  outing: Outing;
  yourShare: number;
}

export function UpcomingOutingChip({ outing, yourShare }: UpcomingOutingChipProps) {
  const accent = getCategoryColor(outing.category);
  const isOwed = yourShare > 0;
  const isOwing = yourShare < 0;

  return (
    <Link
      to={`/outings/${outing.id}`}
      className="fintech-card-hover flex-shrink-0 w-[260px] sm:w-[280px] p-4 group"
    >
      <div className="flex items-start gap-2 mb-3">
        <div className="w-1 h-8 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: accent }} />
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {outing.name}
          </h4>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="truncate">{outing.date}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {outing.members.slice(0, 4).map((m, i) => (
            <Avatar key={m.id} className="h-7 w-7 border-2 border-card" style={{ zIndex: 4 - i }}>
              <AvatarFallback seed={m.id} className="text-[9px] bg-primary/10 text-primary font-medium">{m.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <span
          className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            isOwed && "bg-success/10 text-success",
            isOwing && "bg-destructive/10 text-destructive",
            !isOwed && !isOwing && "bg-muted text-muted-foreground"
          )}
        >
          {isOwed
            ? `+${formatCurrency(yourShare)}`
            : isOwing
            ? formatCurrency(Math.abs(yourShare))
            : "Settled"}
        </span>
      </div>
    </Link>
  );
}