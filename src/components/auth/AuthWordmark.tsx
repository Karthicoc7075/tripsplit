import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/logo.png";

interface AuthWordmarkProps {
  /** "lg" is for the brand panel, "md" for the compact header above the form. */
  size?: "md" | "lg";
  className?: string;
}

export function AuthWordmark({ size = "md", className }: AuthWordmarkProps) {
  const lg = size === "lg";

  return (
    <Link
      to="/login"
      aria-label="TripSplit"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      {/* logo.png is portrait (239×320), so it is sized by height only —
          a square box would letterbox it with dead space either side. */}
      <img
        src={logoImg}
        alt=""
        aria-hidden
        className={cn("w-auto shrink-0 object-contain", lg ? "h-12" : "h-10")}
      />
      <span className={cn("font-bold tracking-tight", lg ? "text-2xl" : "text-xl")}>
        <span style={{ color: "#276ACF" }}>Trip</span>
        <span style={{ color: "#3AA91F" }}>Split</span>
      </span>
      {/* Matches the navbar tag so the app looks like one product before and
          after sign-in. */}
      <span className="-translate-y-1.5 rounded-md border border-primary/40 bg-primary/10 px-1 py-px text-[9px] font-bold uppercase leading-[1.4] tracking-[0.12em] text-primary">
        Beta
      </span>
    </Link>
  );
}
