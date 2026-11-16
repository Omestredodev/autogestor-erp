import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({
  title,
  subtitle,
  close,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: ReactNode;
  close: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  return (
    <div
      className="overlay"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        className={`dialog ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" onClick={close} aria-label="Fechar">
            <X size={21} />
          </button>
        </header>
        <div className="dialog-body">{children}</div>
        {footer && <footer className="dialog-footer-bar">{footer}</footer>}
      </section>
    </div>
  );
}
