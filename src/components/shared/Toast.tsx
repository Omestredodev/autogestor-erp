import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertCircle, Check, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<{ notify: (message: string, tone?: ToastTone) => void } | null>(
  null,
);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const dismiss = (id: number) =>
    setToasts((current) => current.filter((toast) => toast.id !== id));
  const notify = useCallback((message: string, tone: ToastTone = "success") => {
    const id = ++counter.current;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => dismiss(id), tone === "error" ? 6000 : 4000);
  }, []);
  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${toast.tone}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <span>
              {toast.tone === "error" ? (
                <AlertCircle size={16} />
              ) : toast.tone === "info" ? (
                <Info size={16} />
              ) : (
                <Check size={16} />
              )}
            </span>
            <p>{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Fechar notificação">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
