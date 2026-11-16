import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  danger?: boolean;
  /** Disables the item with an explanation. */
  disabledReason?: string;
  hidden?: boolean;
}

export function ActionMenu({
  items,
  label = "Mais opções",
}: {
  items: MenuItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) =>
      !ref.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const visible = items.filter((item) => !item.hidden);
  return (
    <div className="menu-wrap" ref={ref}>
      <button
        type="button"
        className="row-action"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="action-menu" role="menu">
          {visible.map(({ label: itemLabel, icon: Icon, onClick, danger, disabledReason }) => (
            <button
              type="button"
              role="menuitem"
              key={itemLabel}
              className={danger ? "danger" : ""}
              disabled={Boolean(disabledReason)}
              title={disabledReason}
              onClick={() => {
                setOpen(false);
                onClick();
              }}
            >
              {Icon && <Icon size={15} />}
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
