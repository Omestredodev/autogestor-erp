import type { StockMovement } from "../../domain/types";
import { DataTable, EmptyState, Pagination, Status, usePagination } from "../../components/ui";
import { ProductLink, RecordLink } from "../../components/shared/Links";
import type { Route } from "../../app/navigation/routes";
import { useStore } from "../../store/AppProvider";
import { byId, userName } from "../../store/selectors";
import { formatDateTime } from "../../utils/dates";
import { History } from "lucide-react";

export const MOVEMENT_LABELS: Record<StockMovement["type"], string> = {
  initial: "Saldo inicial",
  purchase: "Entrada por compra",
  sale: "Saída por venda",
  return: "Devolução",
  cancellation: "Cancelamento",
  adjustment: "Ajuste manual",
};

export function MovementTable({
  movements,
  showProduct = true,
  pageSize = 10,
}: {
  movements: StockMovement[];
  showProduct?: boolean;
  pageSize?: number;
}) {
  const { state } = useStore();
  const sorted = [...movements].sort(
    (a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id),
  );
  const pagination = usePagination(sorted, pageSize);
  if (!movements.length)
    return (
      <EmptyState
        icon={History}
        title="Nenhuma movimentação"
        text="As entradas e saídas aparecerão aqui."
      />
    );

  const reference = (movement: StockMovement): { label: string; route?: Route } => {
    if (movement.refType === "purchase") {
      const purchase = byId(state.purchases, movement.refId);
      return {
        label: purchase?.number ?? "Compra",
        route: { page: "purchases", id: movement.refId },
      };
    }
    if (movement.refType === "sale") {
      const sale = byId(state.sales, movement.refId);
      return { label: sale?.number ?? "Venda", route: { page: "sales", id: movement.refId } };
    }
    if (movement.refType === "return") {
      const saleReturn = byId(state.returns, movement.refId);
      const sale = saleReturn && byId(state.sales, saleReturn.saleId);
      return {
        label: `${saleReturn?.number ?? "Devolução"}${sale ? ` · ${sale.number}` : ""}`,
        route: sale ? { page: "sales", id: sale.id, tab: "Devoluções" } : undefined,
      };
    }
    return { label: movement.refType === "adjustment" ? "Ajuste" : "Cadastro" };
  };

  return (
    <>
      <DataTable
        headers={[
          "Data e hora",
          ...(showProduct ? ["Produto"] : []),
          "Tipo",
          "Quantidade",
          "Saldo",
          "Origem",
          "Motivo",
          "Usuário",
        ]}
      >
        {pagination.pageItems.map((movement) => {
          const ref = reference(movement);
          const product = byId(state.products, movement.productId);
          return (
            <tr key={movement.id}>
              <td>{formatDateTime(movement.at)}</td>
              {showProduct && (
                <td>
                  <ProductLink id={movement.productId} sub={product?.code} />
                </td>
              )}
              <td>
                <Status
                  value={MOVEMENT_LABELS[movement.type]}
                  tone={
                    movement.quantity > 0
                      ? "success"
                      : movement.type === "adjustment"
                        ? "warning"
                        : "info"
                  }
                />
              </td>
              <td>
                <strong className={movement.quantity > 0 ? "qty-positive" : "qty-negative"}>
                  {movement.quantity > 0 ? "+" : ""}
                  {movement.quantity}
                </strong>
              </td>
              <td>
                {movement.balanceBefore} →{" "}
                <strong className="inline">{movement.balanceAfter}</strong>
              </td>
              <td>
                {ref.route ? <RecordLink route={ref.route}>{ref.label}</RecordLink> : ref.label}
              </td>
              <td className="wrap-cell">{movement.reason}</td>
              <td>{userName(state, movement.userId)}</td>
            </tr>
          );
        })}
      </DataTable>
      <Pagination {...pagination} />
    </>
  );
}
