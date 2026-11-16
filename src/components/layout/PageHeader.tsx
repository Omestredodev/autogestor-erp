import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { pageLabel, type Route } from "../../app/navigation/routes";
import { useLayout } from "./LayoutContext";

export function PageHeader({
  title,
  subtitle,
  actions,
  record,
  backTo,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  record?: string;
  backTo?: Route;
}) {
  const { route, navigate, back, canGoBack } = useNavigation();
  const { collapsed, setCollapsed } = useLayout();
  const moduleLabel = pageLabel(route.page);
  return (
    <div className="page-heading">
      <div>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate({ page: "dashboard" })}>
            AutoGestor
          </button>
          <ChevronRight size={13} />
          {record ? (
            <>
              <button type="button" onClick={() => navigate({ page: route.page })}>
                {moduleLabel}
              </button>
              <ChevronRight size={13} />
              <span aria-current="page">{record}</span>
            </>
          ) : (
            <span aria-current="page">{moduleLabel}</span>
          )}
        </nav>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="heading-actions">
        {backTo && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => (canGoBack ? back() : navigate(backTo))}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        )}
        {actions}
        <button
          type="button"
          className="icon-button collapse-button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
      </div>
    </div>
  );
}
