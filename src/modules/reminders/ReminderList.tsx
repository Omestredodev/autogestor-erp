import { useState } from "react";
import {
  CalendarClock,
  Check,
  Clock,
  History,
  Package,
  Pencil,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import type { Reminder } from "../../domain/types";
import { ActionMenu, EmptyState, Status } from "../../components/ui";
import { useCommand } from "../../components/shared/useCommand";
import { useDeny } from "../../components/shared/permissions";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId, isReminderDue, userName } from "../../store/selectors";
import { formatDate, formatDateTime, formatTime, isSameDay } from "../../utils/dates";

export const REMINDER_STATUS = {
  pending: "Pendente",
  done: "Concluído",
  cancelled: "Cancelado",
} as const;

export function ReminderList({ reminders, focusId }: { reminders: Reminder[]; focusId?: string }) {
  const { state } = useStore();
  const { navigate, open } = useNavigation();
  const { execute } = useCommand();
  const deny = useDeny();
  const [expanded, setExpanded] = useState<string | null>(focusId ?? null);
  const now = new Date();
  if (!reminders.length)
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nenhum lembrete"
        text="Crie lembretes vinculados a clientes, produtos ou vendas."
      />
    );
  const sorted = [...reminders].sort(
    (a, b) =>
      Number(a.status !== "pending") - Number(b.status !== "pending") ||
      a.notifyAt.localeCompare(b.notifyAt),
  );
  const denied = deny("reminders.manage");
  return (
    <div className="reminder-board">
      {sorted.map((reminder) => {
        const due = isReminderDue(reminder, now);
        const customer = byId(state.customers, reminder.customerId);
        const product = byId(state.products, reminder.productId);
        const sale = byId(state.sales, reminder.saleId);
        return (
          <div
            className={`reminder-card ${reminder.id === focusId ? "focused" : ""} ${reminder.status !== "pending" ? "closed" : ""}`}
            key={reminder.id}
          >
            <div className="reminder-time">
              <strong>{formatTime(reminder.notifyAt)}</strong>
              <small>
                {isSameDay(reminder.notifyAt, now) ? "Hoje" : formatDate(reminder.notifyAt)}
              </small>
            </div>
            <div>
              <span className="status-row">
                <Status value={due ? "Vencido" : REMINDER_STATUS[reminder.status]} />
                {reminder.notifyAt !== reminder.dueAt && reminder.status === "pending" && (
                  <Status value="Adiado" tone="info" />
                )}
              </span>
              <h3>{reminder.title}</h3>
              {reminder.description && <p>{reminder.description}</p>}
              <p>
                <User size={12} /> {userName(state, reminder.ownerId)} ·{" "}
                {reminder.sharing === "team" ? "Equipe" : "Privado"}
              </p>
              <div className="reminder-links">
                {customer && (
                  <button
                    type="button"
                    onClick={() => navigate({ page: "clients", id: customer.id })}
                  >
                    <User size={12} /> {customer.name}
                  </button>
                )}
                {product && (
                  <button
                    type="button"
                    onClick={() => navigate({ page: "products", id: product.id })}
                  >
                    <Package size={12} /> {product.code}
                  </button>
                )}
                {sale && (
                  <button type="button" onClick={() => navigate({ page: "sales", id: sale.id })}>
                    <ShoppingCart size={12} /> {sale.number}
                  </button>
                )}
              </div>
              {expanded === reminder.id && (
                <ul className="reminder-history">
                  {reminder.history.map((entry, index) => (
                    <li key={index}>
                      {formatDateTime(entry.at)} · {userName(state, entry.userId)} · {entry.action}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="reminder-actions">
              {reminder.status === "pending" && (
                <button
                  type="button"
                  title={denied ?? "Concluir"}
                  aria-label="Concluir"
                  disabled={Boolean(denied)}
                  onClick={() =>
                    execute({ type: "reminder.setStatus", id: reminder.id, status: "done" })
                  }
                >
                  <Check size={17} />
                </button>
              )}
              <ActionMenu
                items={[
                  {
                    label: "Adiar 30 minutos",
                    icon: Clock,
                    onClick: () =>
                      execute({ type: "reminder.postpone", id: reminder.id, minutes: 30 }),
                    hidden: reminder.status !== "pending",
                    disabledReason: denied,
                  },
                  {
                    label: "Adiar 1 hora",
                    icon: Clock,
                    onClick: () =>
                      execute({ type: "reminder.postpone", id: reminder.id, minutes: 60 }),
                    hidden: reminder.status !== "pending",
                    disabledReason: denied,
                  },
                  {
                    label: "Editar",
                    icon: Pencil,
                    onClick: () => open({ type: "reminder-form", reminderId: reminder.id }),
                    hidden: reminder.status !== "pending",
                    disabledReason: denied,
                  },
                  {
                    label: expanded === reminder.id ? "Ocultar histórico" : "Ver histórico",
                    icon: History,
                    onClick: () => setExpanded(expanded === reminder.id ? null : reminder.id),
                  },
                  {
                    label: "Cancelar lembrete",
                    icon: X,
                    danger: true,
                    onClick: () =>
                      execute({ type: "reminder.setStatus", id: reminder.id, status: "cancelled" }),
                    hidden: reminder.status !== "pending",
                    disabledReason: denied,
                  },
                ]}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
