import { useEffect, useState } from "react";
import { Bell, Check, ExternalLink, X } from "lucide-react";
import { useCommand } from "../../components/shared/useCommand";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId, isReminderDue, visibleReminders } from "../../store/selectors";
import { formatDateTime } from "../../utils/dates";

/** Pops up pending reminders whose notification time has arrived while the app is open. */
export function ReminderNotifier() {
  const { state, user, can } = useStore();
  const { navigate } = useNavigation();
  const { execute, busy } = useCommand();
  const [now, setNow] = useState(() => new Date());
  // Dismissed per notification moment, so postponing re-triggers it.
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!can("reminders.manage")) return null;
  const due = visibleReminders(state, user.id)
    .filter(
      (reminder) =>
        isReminderDue(reminder, now) && !dismissed.includes(`${reminder.id}@${reminder.notifyAt}`),
    )
    .sort((a, b) => a.notifyAt.localeCompare(b.notifyAt));
  const reminder = due[0];
  if (!reminder) return null;
  const sale = byId(state.sales, reminder.saleId);
  const customer = byId(state.customers, reminder.customerId);
  const product = byId(state.products, reminder.productId);
  const related = sale
    ? { label: `Venda ${sale.number}`, route: { page: "sales" as const, id: sale.id } }
    : customer
      ? { label: customer.name, route: { page: "clients" as const, id: customer.id } }
      : product
        ? { label: product.code, route: { page: "products" as const, id: product.id } }
        : null;

  return (
    <div className="reminder-popup" role="alertdialog" aria-label="Lembrete">
      <button
        type="button"
        onClick={() => setDismissed([...dismissed, `${reminder.id}@${reminder.notifyAt}`])}
        aria-label="Dispensar por agora"
        title="Dispensar por agora"
      >
        <X size={17} />
      </button>
      <div className="popup-icon">
        <Bell size={20} />
      </div>
      <div>
        <span>
          LEMBRETE · {formatDateTime(reminder.notifyAt)}
          {due.length > 1 ? ` · +${due.length - 1} pendente(s)` : ""}
        </span>
        <h3>{reminder.title}</h3>
        {reminder.description && <p>{reminder.description}</p>}
        {related && (
          <button
            type="button"
            className="table-link popup-link"
            onClick={() => navigate(related.route)}
          >
            <ExternalLink size={13} /> {related.label}
          </button>
        )}
      </div>
      <div className="popup-actions">
        <button
          type="button"
          disabled={busy}
          onClick={() => execute({ type: "reminder.setStatus", id: reminder.id, status: "done" })}
        >
          <Check size={16} /> Concluir
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => execute({ type: "reminder.postpone", id: reminder.id, minutes: 30 })}
        >
          Adiar 30 min
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => execute({ type: "reminder.postpone", id: reminder.id, minutes: 60 })}
        >
          Adiar 1 hora
        </button>
      </div>
      <button
        type="button"
        className="popup-cancel"
        disabled={busy}
        onClick={() =>
          execute({ type: "reminder.setStatus", id: reminder.id, status: "cancelled" })
        }
      >
        Cancelar lembrete
      </button>
    </div>
  );
}
