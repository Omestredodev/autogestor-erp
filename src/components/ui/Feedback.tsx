import type { ReactNode } from "react";
import { AlertCircle, Info, Lock, type LucideIcon } from "lucide-react";

export type Tone = "success" | "warning" | "danger" | "neutral" | "info" | "muted";

const TONES: Record<string, Tone> = {
  Cancelada: "danger",
  Cancelado: "danger",
  "Sem estoque": "danger",
  Inativo: "danger",
  Inativa: "danger",
  Descartada: "muted",
  "Reembolso pendente": "danger",
  Vencido: "danger",
  "Em aberto": "warning",
  "Estoque baixo": "warning",
  Pendente: "warning",
  "Parcialmente pago": "warning",
  "Em fechamento": "info",
  Rascunho: "warning",
  "Devolução parcial": "warning",
  Devolvida: "muted",
  "Acima do máximo": "info",
  Ativo: "neutral",
  Online: "neutral",
  Agendado: "neutral",
  "Sem saldo": "muted",
};

export function Status({ value, tone }: { value: string; tone?: Tone }) {
  return (
    <span className={`status ${tone ?? TONES[value] ?? "success"}`}>
      <i />
      {value}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div>
        <Icon size={27} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function Notice({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children?: ReactNode;
  tone?: "info" | "danger" | "warning";
}) {
  const Icon = tone === "info" ? Info : AlertCircle;
  return (
    <div
      className={
        tone === "danger"
          ? "danger-notice"
          : tone === "warning"
            ? "notice warning-notice"
            : "notice"
      }
      role={tone === "danger" ? "alert" : undefined}
    >
      <Icon size={18} />
      <div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}

export function ErrorBanner({ error }: { error?: string | null }) {
  if (!error) return null;
  return (
    <Notice title="Não foi possível concluir" tone="danger">
      {error}
    </Notice>
  );
}

export function Restricted({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="card">
      <EmptyState
        icon={Lock}
        title="Acesso restrito para este perfil"
        text={message}
        action={action}
      />
    </div>
  );
}
