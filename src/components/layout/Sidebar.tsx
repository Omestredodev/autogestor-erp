import { Car, X } from "lucide-react";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { canAccessPage, NAV_ITEMS, type Page } from "../../app/navigation/routes";
import { useStore } from "../../store/AppProvider";
import { lowStockProducts, reminderBadge } from "../../store/selectors";
import { useLayout } from "./LayoutContext";

export function Sidebar() {
  const { state, can, user } = useStore();
  const { route, navigate } = useNavigation();
  const { collapsed, mobileOpen, setMobileOpen } = useLayout();
  const badges: Partial<Record<Page, number>> = {
    inventory: lowStockProducts(state).length,
    reminders: reminderBadge(state, user.id),
  };
  const go = (page: Page) => {
    navigate({ page });
    setMobileOpen(false);
  };
  return (
    <>
      {mobileOpen && (
        <div className="overlay mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
      >
        <div className="brand">
          <div className="brand-mark">
            <Car size={23} strokeWidth={2.4} />
          </div>
          {!collapsed && (
            <div>
              <strong>AutoGestor</strong>
              <small>Gestão para autopeças</small>
            </div>
          )}
          <button
            type="button"
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Navegação principal">
          {NAV_ITEMS.filter((item) => canAccessPage(item.id, can)).map(
            ({ id, label, icon: Icon }) => (
              <button
                type="button"
                className={route.page === id ? "active" : ""}
                key={id}
                onClick={() => go(id)}
                title={collapsed ? label : undefined}
                aria-current={route.page === id ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{label}</span>
                {!collapsed && badges[id] ? <i>{badges[id]}</i> : null}
                {collapsed && badges[id] ? <em className="nav-dot" /> : null}
              </button>
            ),
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="company-avatar">
            {state.settings.tradeName
              .split(" ")
              .slice(0, 2)
              .map((word) => word[0])
              .join("")
              .toUpperCase()}
          </div>
          {!collapsed && (
            <div>
              <strong>{state.settings.tradeName}</strong>
              <small>Ambiente demonstrativo</small>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
