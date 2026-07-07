import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FlowSplitMember {
  memberId: string;
  name: string;
  amount: number;
}

interface FlowPayment {
  memberId: string;
  name: string;
  amount: number;
}

interface TransactionFlowMapProps {
  uniqueId: string;
  payerName: string;
  payerId: string;
  totalAmount: number;
  splits: FlowSplitMember[];
  currentUserId: string;
  delay?: number;
  payments?: FlowPayment[];
}

export function TransactionFlowMap({
  uniqueId,
  payerName,
  payerId,
  totalAmount,
  splits,
  currentUserId,
  delay = 0,
  payments,
}: TransactionFlowMapProps) {
  const N = splits.length;
  const H_item = 64; // height of each right-hand node in px
  const G = 16;      // gap between right-hand nodes in px
  const W_svg = 80;  // width of SVG canvas in px

  const totalHeight = N * H_item + (N - 1) * G;
  const yPayer = totalHeight / 2;

  // Premium Apple-style Cubic Bezier easeOutExpo
  const premiumEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

  const gradId = `flow-grad-${uniqueId}`;
  const arrowheadId = `arrowhead-${uniqueId}`;

  return (
    <div className="w-full flex flex-col items-center py-2 select-none">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Transaction Split Flow
      </div>

      <div 
        className="flex items-center justify-center" 
        style={{ height: `${totalHeight}px` }}
      >
        {/* Left Node: Payer(s) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: -25 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          whileHover={{ scale: 1.04, y: -2 }}
          transition={{ 
            type: "spring", 
            stiffness: 120, 
            damping: 14,
            delay: delay
          }}
          className={cn(
            "w-36 flex flex-col items-center justify-center p-3 rounded-2xl border text-center shadow-md hover:shadow-lg shrink-0 z-10 cursor-default transition-shadow duration-300",
            payerId === currentUserId 
              ? "border-primary/80 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent text-primary shadow-primary/5" 
              : "border-border bg-gradient-to-br from-muted/50 via-muted/20 to-transparent text-foreground"
          )}
        >
          {payments && payments.length > 1 ? (
            <div className="w-full">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none mb-2">
                Paid By
              </p>
              <div className="flex flex-col gap-1 w-full text-left text-[11px] border-b border-primary/20 pb-2 mb-2">
                {payments.map((p) => (
                  <div key={p.memberId} className="flex justify-between gap-2">
                    <span className="truncate font-semibold text-foreground/80">{p.name}</span>
                    <span className="font-bold text-foreground shrink-0">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] font-medium text-muted-foreground leading-none">Total</p>
              <p className="text-sm font-extrabold mt-1.5 tabular-nums text-primary">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          ) : (
            <>
              <Avatar className="h-10 w-10 border border-primary/20 bg-background mb-1.5 shrink-0 shadow-sm">
                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                  {payerName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-none">
                Paid by
              </p>
              <p className="text-xs font-bold truncate max-w-full leading-snug mt-0.5">
                {payerId === currentUserId ? "You" : payerName}
              </p>
              <p className="text-sm font-extrabold mt-1.5 tabular-nums text-primary">
                {formatCurrency(totalAmount)}
              </p>
            </>
          )}
        </motion.div>

        {/* Middle SVG Canvas: Connector Lines */}
        <div 
          className="relative shrink-0" 
          style={{ width: `${W_svg}px`, height: `${totalHeight}px` }}
        >
          <svg 
            className="absolute inset-0 overflow-visible pointer-events-none"
            width={W_svg} 
            height={totalHeight}
          >
            <defs>
              {/* Premium Neon Financial Gradient */}
              <linearGradient 
                id={gradId} 
                gradientUnits="userSpaceOnUse"
                x1="0" 
                y1="0" 
                x2={W_svg} 
                y2="0"
              >
                <stop offset="0%" stopColor="rgb(15,118,110)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="rgb(20,184,166)" stopOpacity={1} />
              </linearGradient>

              {/* Arrowhead aligned with gradient end color */}
              <marker
                id={arrowheadId}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgb(20,184,166)" />
              </marker>
            </defs>

            {splits.map((s, idx) => {
              const yMember = idx * (H_item + G) + H_item / 2;
              const pathD = `M 0 ${yPayer} C ${W_svg / 2} ${yPayer}, ${W_svg / 2} ${yMember}, ${W_svg} ${yMember}`;

              // Staggered path drawing delay
              const drawDelay = delay + 0.12 + idx * 0.08;

              return (
                <motion.path
                  key={s.memberId}
                  d={pathD}
                  fill="none"
                  stroke={`url(#${gradId})`}
                  strokeWidth={2}
                  markerEnd={`url(#${arrowheadId})`}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ ease: premiumEase, duration: 0.8, delay: drawDelay }}
                />
              );
            })}
          </svg>
        </div>

        {/* Right Nodes: Splits */}
        <div 
          className="flex flex-col shrink-0 justify-between animate-fade-in" 
          style={{ height: `${totalHeight}px` }}
        >
          {splits.map((s, idx) => {
            const isUser = s.memberId === currentUserId;
            // Delay node entrance to synchronize exactly with when path touches it
            const nodeDelay = delay + 0.22 + idx * 0.08;

            return (
              <motion.div
                key={s.memberId}
                initial={{ opacity: 0, scale: 0.9, x: 18 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                whileHover={{ scale: 1.04, x: 3 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 140, 
                  damping: 13,
                  delay: nodeDelay
                }}
                className={cn(
                  "w-28 sm:w-32 flex flex-col items-center justify-center rounded-2xl border text-center shadow-sm hover:shadow-md shrink-0 z-10 cursor-default transition-shadow duration-300",
                  isUser ? "border-primary/50 bg-gradient-to-br from-primary/5 via-card to-card" : "border-border bg-card",
                  s.memberId === payerId && "border-dashed border-muted-foreground/40"
                )}
                style={{ height: `${H_item}px` }}
              >
                <div className="flex items-center gap-1.5 px-2 max-w-full">
                  <Avatar className="h-5 w-5 border border-border bg-background shrink-0">
                    <AvatarFallback className="text-[9px] font-bold text-muted-foreground/80 bg-muted/40">
                      {s.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-[11px] font-semibold truncate max-w-[70px] leading-tight text-muted-foreground">
                    {s.name}
                  </p>
                </div>
                <p className="text-xs font-extrabold mt-1 text-foreground tabular-nums">
                  {formatCurrency(s.amount)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
