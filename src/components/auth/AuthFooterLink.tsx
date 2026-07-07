import { Link } from "react-router-dom";

interface AuthFooterLinkProps {
  text: string;
  linkText: string;
  to: string;
}

export function AuthFooterLink({ text, linkText, to }: AuthFooterLinkProps) {
  return (
    <p className="text-xs text-muted-foreground">
      {text}{" "}
      <Link to={to} className="text-primary font-semibold hover:underline transition-colors">
        {linkText}
      </Link>
    </p>
  );
}