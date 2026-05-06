import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-border/70 bg-card p-8 text-center shadow-elegant-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Ops! Ocorreu um erro ao carregar esta página
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Algo inesperado aconteceu. Você pode tentar novamente ou voltar para o início.
          </p>
          {this.state.error?.message && (
            <pre className="mt-3 max-h-28 overflow-auto rounded-md bg-muted px-3 py-2 text-left text-[11px] text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/app")}>
              Ir para o início
            </Button>
            <Button size="sm" onClick={this.reset}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;