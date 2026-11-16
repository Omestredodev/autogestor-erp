import { ShieldCheck } from "lucide-react";
import type { AuditEvent } from "../../domain/types";
import { DataTable, EmptyState, Pagination, usePagination } from "../../components/ui";
import { RecordLink } from "../../components/shared/Links";
import type { Route } from "../../app/navigation/routes";
import { useStore } from "../../store/AppProvider";
import { byId } from "../../store/selectors";
import { formatDateTime } from "../../utils/dates";

export function auditRoute(
  state: ReturnType<typeof useStore>["state"],
  event: AuditEvent,
): Route | undefined {
  switch (event.entityType) {
    case "Produto":
    case "Estoque":
      return byId(state.products, event.entityId)
        ? { page: "products", id: event.entityId }
        : undefined;
    case "Venda":
      return { page: "sales", id: event.entityId };
    case "Devolução": {
      const saleReturn = byId(state.returns, event.entityId);
      return saleReturn ? { page: "sales", id: saleReturn.saleId, tab: "Devoluções" } : undefined;
    }
    case "Cliente":
      return { page: "clients", id: event.entityId };
    case "Fornecedor":
      return { page: "suppliers", id: event.entityId };
    case "Compra":
      return { page: "purchases", id: event.entityId };
    case "Fechamento":
      return { page: "closings", id: event.entityId };
    case "Pagamento": {
      const payment = byId(state.payments, event.entityId);
      if (payment?.closingId) return { page: "closings", id: payment.closingId };
      if (payment?.saleId) return { page: "sales", id: payment.saleId, tab: "Pagamentos" };
      return undefined;
    }
    case "Lembrete":
      return { page: "reminders", params: { focus: event.entityId } };
    case "Aplicação":
    case "Equivalência":
      return event.relatedIds?.[0]
        ? {
            page: "products",
            id: event.relatedIds[0],
            tab: event.entityType === "Aplicação" ? "Aplicações" : "Equivalentes",
          }
        : undefined;
    case "Usuário":
    case "Perfil":
      return { page: "admin" };
    default:
      return undefined;
  }
}

export function AuditTable({
  events,
  pageSize = 12,
  compact = false,
}: {
  events: AuditEvent[];
  pageSize?: number;
  compact?: boolean;
}) {
  const { state } = useStore();
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
  const pagination = usePagination(sorted, pageSize);
  if (!events.length)
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Nenhum evento de auditoria"
        text="As operações realizadas sobre este registro aparecerão aqui."
      />
    );
  return (
    <>
      <DataTable
        headers={
          compact
            ? ["Data e hora", "Usuário", "Operação", "Descrição", "Anterior", "Posterior"]
            : [
                "Data e hora",
                "Usuário",
                "Operação",
                "Entidade",
                "Registro",
                "Descrição",
                "Valor anterior",
                "Valor posterior",
              ]
        }
      >
        {pagination.pageItems.map((event) => {
          const route = auditRoute(state, event);
          return (
            <tr key={event.id}>
              <td>{formatDateTime(event.at)}</td>
              <td>{event.userName}</td>
              <td>
                <strong>{event.operation}</strong>
              </td>
              {!compact && <td>{event.entityType}</td>}
              {!compact && (
                <td>
                  {route ? (
                    <RecordLink route={route}>{event.entityLabel}</RecordLink>
                  ) : (
                    event.entityLabel
                  )}
                </td>
              )}
              <td className="wrap-cell">{event.description}</td>
              <td className="wrap-cell muted-cell">{event.before ?? "—"}</td>
              <td className="wrap-cell">{event.after ?? "—"}</td>
            </tr>
          );
        })}
      </DataTable>
      <Pagination {...pagination} />
    </>
  );
}
