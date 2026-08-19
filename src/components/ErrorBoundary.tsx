import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence: without it a single render-time exception unmounts the
 * whole tree and leaves a blank white page with no way back.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  private handleHome = () => {
    this.setState({ error: null });
    window.location.assign("/dashboard");
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center"
      >
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            The page hit an unexpected error. Your data is safe — nothing was lost.
          </p>
        </div>

        <details className="max-w-md text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Technical details
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-[11px] text-muted-foreground">
            {error.message}
          </pre>
        </details>

        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
          <button
            type="button"
            onClick={this.handleHome}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Home className="h-4 w-4" /> Go to dashboard
          </button>
        </div>
      </div>
    );
  }
}
