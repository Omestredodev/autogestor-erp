import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

/** Keeps a failure in one screen from taking down the whole shell. */
export class ErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card">
        <div className="empty-state">
          <div>
            <AlertCircle size={27} />
          </div>
          <h3>Não foi possível exibir esta tela</h3>
          <p>{this.state.error.message}</p>
          <div className="empty-action">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                this.setState({ error: null });
                this.props.onReset?.();
              }}
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
