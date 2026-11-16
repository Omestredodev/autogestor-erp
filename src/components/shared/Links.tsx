import type { ReactNode } from "react";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { canAccessPage, type Route } from "../../app/navigation/routes";
import { byId } from "../../store/selectors";

/** Contextual link that opens the exact record; renders plain text when the profile lacks access. */
export function RecordLink({
  route,
  children,
  sub,
}: {
  route: Route;
  children: ReactNode;
  sub?: ReactNode;
}) {
  const { navigate } = useNavigation();
  const { can } = useStore();
  const allowed = canAccessPage(route.page, can);
  return (
    <>
      {allowed ? (
        <button type="button" className="table-link" onClick={() => navigate(route)}>
          {children}
        </button>
      ) : (
        <strong title="Seu perfil não possui acesso a este módulo">{children}</strong>
      )}
      {sub && <small>{sub}</small>}
    </>
  );
}

export function CustomerLink({ id, sub }: { id: string; sub?: ReactNode }) {
  const { state } = useStore();
  const customer = byId(state.customers, id);
  if (!customer) return <>—</>;
  if (customer.generic) return <strong>AO CONSUMIDOR</strong>;
  return (
    <RecordLink route={{ page: "clients", id }} sub={sub}>
      {customer.name}
    </RecordLink>
  );
}

export function ProductLink({ id, label, sub }: { id: string; label?: string; sub?: ReactNode }) {
  const { state } = useStore();
  const product = byId(state.products, id);
  return (
    <RecordLink route={{ page: "products", id }} sub={sub}>
      {label ?? product?.name ?? "Produto removido"}
    </RecordLink>
  );
}

export function SaleLink({ id }: { id: string }) {
  const { state } = useStore();
  const sale = byId(state.sales, id);
  return <RecordLink route={{ page: "sales", id }}>{sale?.number ?? "—"}</RecordLink>;
}
