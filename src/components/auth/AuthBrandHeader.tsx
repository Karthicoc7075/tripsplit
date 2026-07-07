import { motion } from "framer-motion";
import flaticonImg from "@/assets/vite.png";

interface AuthBrandHeaderProps {
  title: string;
  subtitle: string;
}

export function AuthBrandHeader({ title, subtitle }: AuthBrandHeaderProps) {
  return (
    <div className="text-center mb-8 sm:mb-10">
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.4 }}
        className="flex flex-col items-center justify-center gap-3 mb-5"
      >
        <img src={flaticonImg} alt="TripSplit Logo" className="h-20 w-20 object-contain rounded-xl shadow-md" />
        <div className="flex items-center gap-2">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight">
            <span style={{ color: "#276ACF" }}>Trip</span><span style={{ color: "#3AA91F" }}>Split</span>
          </span>
          <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.16, duration: 0.4 }}
        className="text-2xl sm:text-[1.65rem] font-semibold tracking-tight text-foreground"
      >
        {title}
      </motion.h1>

      <motion.p
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.24, duration: 0.4 }}
        className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed"
      >
        {subtitle}
      </motion.p>
    </div>
  );
}