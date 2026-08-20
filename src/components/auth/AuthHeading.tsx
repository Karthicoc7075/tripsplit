import { AuthWordmark } from "@/components/auth/AuthWordmark";

interface AuthHeadingProps {
  title: string;
  subtitle: string;
}

export function AuthHeading({ title, subtitle }: AuthHeadingProps) {
  return (
    <div className="mb-8">
      {/* The brand panel already carries the mark on large screens. */}
      <AuthWordmark className="mb-8 lg:hidden" />

      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}
