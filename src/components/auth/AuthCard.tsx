import type { ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ children, footer }: AuthCardProps) {
  return (
    <div className="auth-card rounded-2xl overflow-hidden">
      <div className="p-7 sm:p-8">{children}</div>
      {footer && (
        <div className="auth-card-footer px-7 sm:px-8 py-5 text-center">
          {footer}
        </div>
      )}
    </div>
  );
}