import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Card({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-header">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action && <div className="card-actions">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function MiniStat({
  label,
  value,
  icon: Icon,
  tone = "",
  hint,
  onClick,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: string;
  hint?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className={tone}>
        <Icon size={20} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {hint && <em>{hint}</em>}
      </div>
    </>
  );
  return onClick ? (
    <button type="button" className="mini-stat clickable" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="mini-stat">{content}</div>
  );
}

export function InfoSection({ title, values }: { title: string; values: [string, ReactNode][] }) {
  return (
    <section className="info-section">
      <h3>{title}</h3>
      <div>
        {values.map(([label, value]) => (
          <div className="info-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
