import type { ReactNode } from "react";
import { Loader2, type LucideIcon } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "success";

const variantClass: Record<Variant, string> = {
  primary: "primary-button",
  secondary: "secondary-button",
  danger: "danger-button",
  success: "success-button",
};

export interface ButtonProps {
  children?: ReactNode;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: Variant;
  full?: boolean;
  small?: boolean;
  disabled?: boolean;
  /** When set, the button is disabled and explains why (permission or state). */
  disabledReason?: string;
  loading?: boolean;
  type?: "button" | "submit";
  title?: string;
  className?: string;
}

export function Button({
  children,
  icon: Icon,
  onClick,
  variant = "primary",
  full,
  small,
  disabled,
  disabledReason,
  loading,
  type = "button",
  title,
  className = "",
}: ButtonProps) {
  const isDisabled = disabled || Boolean(disabledReason) || loading;
  return (
    <button
      type={type}
      className={`${variantClass[variant]} ${full ? "full" : ""} ${small ? "small" : ""} ${className}`}
      onClick={onClick}
      disabled={isDisabled}
      title={disabledReason ?? title}
      aria-busy={loading || undefined}
    >
      {loading ? <Loader2 size={16} className="spin" /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  badge,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  badge?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Icon size={19} />
      {badge ? <b className="icon-badge">{badge > 99 ? "99+" : badge}</b> : null}
    </button>
  );
}

export function LinkButton({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button type="button" className="table-link" onClick={onClick} title={title}>
      {children}
    </button>
  );
}
