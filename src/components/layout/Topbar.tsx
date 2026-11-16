import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  Boxes,
  CalendarClock,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  RotateCcw,
  Settings,
  Sun,
  UserCog,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { canAccessPage, type Route } from "../../app/navigation/routes";
import { useStore } from "../../store/AppProvider";
import {
  isReminderDue,
  lowStockProducts,
  reminderBadge,
  visibleReminders,
} from "../../store/selectors";
import { activeReceivables, pendingRefunds } from "../../domain/rules/finance";
import { useCommand } from "../shared/useCommand";
import { money } from "../../utils/currency";
import { useLayout } from "./LayoutContext";
import { GlobalSearch } from "./GlobalSearch";
import { IconButton } from "../ui";

interface Alert {
  key: string;
  icon: LucideIcon;
  tone: string;
  title: string;
  text: string;
  route: Route;
}

function useOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && close();
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);
  return ref;
}

export function Topbar({
  dark,
  onTheme,
  onLogout,
}: {
  dark: boolean;
  onTheme: () => void;
  onLogout: () => void;
}) {
  const { state, user, role, can } = useStore();
  const { navigate, open } = useNavigation();
  const { setMobileOpen } = useLayout();
  const { execute } = useCommand();
  const [accountOpen, setAccountOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const accountRef = useOutside<HTMLDivElement>(accountOpen, () => setAccountOpen(false));
  const alertsRef = useOutside<HTMLDivElement>(alertsOpen, () => setAlertsOpen(false));
  const now = new Date();

  const alerts: Alert[] = [];
  if (state.settings.lowStockAlerts && canAccessPage("inventory", can)) {
    for (const product of lowStockProducts(state).slice(0, 4)) {
      alerts.push({
        key: product.id,
        icon: Boxes,
        tone: product.stock === 0 ? "danger" : "warning",
        title: product.stock === 0 ? "Produto sem estoque" : "Estoque baixo",
        text: `${product.code} — ${product.name}: ${product.stock} un. (mín. ${product.min})`,
        route: { page: "products", id: product.id, tab: "Estoque" },
      });
    }
  }
  if (canAccessPage("reminders", can)) {
    for (const reminder of visibleReminders(state, user.id)
      .filter((item) => isReminderDue(item, now))
      .slice(0, 3)) {
      alerts.push({
        key: reminder.id,
        icon: CalendarClock,
        tone: "warning",
        title: "Lembrete vencido",
        text: reminder.title,
        route: { page: "reminders", params: { focus: reminder.id } },
      });
    }
  }
  if (canAccessPage("finance", can)) {
    for (const refund of pendingRefunds(state).slice(0, 3)) {
      alerts.push({
        key: refund.key,
        icon: WalletCards,
        tone: "danger",
        title: "Reembolso pendente",
        text: `${money(refund.amount)} a devolver ao cliente`,
        route: refund.saleId
          ? { page: "sales", id: refund.saleId, tab: "Pagamentos" }
          : { page: "closings", id: refund.closingId },
      });
    }
    const overdue = activeReceivables(state).filter(
      (item) => item.balance > 0.005 && new Date(`${item.receivable.dueDate}T23:59:59`) < now,
    );
    if (overdue.length)
      alerts.push({
        key: "overdue",
        icon: AlertCircle,
        tone: "danger",
        title: "Títulos vencidos",
        text: `${overdue.length} conta(s) a receber vencida(s)`,
        route: { page: "finance", tab: "Contas a receber" },
      });
  }

  const go = (route: Route) => {
    navigate(route);
    setAlertsOpen(false);
    setAccountOpen(false);
  };

  return (
    <header className="topbar">
      <IconButton
        icon={Menu}
        label="Abrir menu"
        className="mobile-menu"
        onClick={() => setMobileOpen(true)}
      />
      <GlobalSearch />
      <div className="top-actions">
        <span
          className="demo-badge"
          title="Os dados ficam salvos apenas neste navegador (localStorage). Não é uma solução de produção."
        >
          Demonstração
        </span>
        {canAccessPage("reminders", can) && (
          <IconButton
            icon={CalendarClock}
            label="Lembretes pendentes"
            className="reminder-button"
            badge={reminderBadge(state, user.id)}
            onClick={() => navigate({ page: "reminders" })}
          />
        )}
        <div className="menu-wrap" ref={alertsRef}>
          <IconButton
            icon={Bell}
            label="Notificações"
            badge={alerts.length}
            onClick={() => setAlertsOpen(!alertsOpen)}
          />
          {alertsOpen && (
            <div className="alerts-menu">
              <header>
                <strong>Notificações</strong>
                <span>{alerts.length} alerta(s)</span>
              </header>
              {alerts.length === 0 ? (
                <p className="alerts-empty">Nenhum alerta no momento.</p>
              ) : (
                alerts.map(({ key, icon: Icon, tone, title, text, route }) => (
                  <button type="button" key={key} onClick={() => go(route)}>
                    <span className={tone}>
                      <Icon size={16} />
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <small>{text}</small>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <IconButton
          icon={dark ? Sun : Moon}
          label={dark ? "Usar tema claro" : "Usar tema escuro"}
          onClick={onTheme}
        />
        <div className="profile-switch">
          <select
            value={role.id}
            onChange={(event) =>
              execute({ type: "session.switchRole", roleId: event.target.value })
            }
            aria-label="Perfil de demonstração"
            title="Perfil de demonstração: altera permissões e navegação"
          >
            {state.roles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="menu-wrap" ref={accountRef}>
          <button
            type="button"
            className="account"
            onClick={() => setAccountOpen(!accountOpen)}
            aria-expanded={accountOpen}
          >
            <span>{user.initials}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{role.name}</small>
            </div>
            <ChevronDown size={15} />
          </button>
          {accountOpen && (
            <div className="account-menu">
              <div className="account-menu-head">
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
              {can("users.manage") && (
                <button
                  type="button"
                  onClick={() => go({ page: "admin", params: { userId: user.id } })}
                >
                  <UserCog size={16} /> Minha conta
                </button>
              )}
              <button type="button" onClick={() => go({ page: "settings" })}>
                <Settings size={16} /> Configurações
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  open({ type: "reset-demo" });
                }}
              >
                <RotateCcw size={16} /> Restaurar demonstração
              </button>
              <hr />
              <button type="button" className="danger" onClick={onLogout}>
                <LogOut size={16} /> Sair do sistema
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
