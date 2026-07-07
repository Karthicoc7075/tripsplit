import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface TransactionSuccessProps {
  show: boolean;
}

export function TransactionSuccess({ show }: TransactionSuccessProps) {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="flex flex-col items-center gap-3"
      >
        <motion.div
          className="h-16 w-16 rounded-full bg-success flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.5 }}
        >
          <Check className="h-8 w-8 text-success-foreground" strokeWidth={3} />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-semibold text-success"
        >
          Expense saved!
        </motion.p>
      </motion.div>

      {/* Confetti particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: ["#0F766E", "#F59E0B", "#10B981", "#EF4444"][i % 4],
            left: "50%",
            top: "50%",
          }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200,
            opacity: 0,
          }}
          transition={{ duration: 0.8, delay: 0.1 + i * 0.03 }}
        />
      ))}
    </motion.div>
  );
}