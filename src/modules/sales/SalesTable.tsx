import { ShoppingCart } from "lucide-react";
import type { Sale } from "../../domain/types";
import { DataTable, EmptyState, Pagination, Status, usePagination } from "../../components/ui";
import { CustomerLink, SaleLink } from "../../components/shared/Links";
import { useStore } from "../../store/AppProvider";
import {
  saleBalance,
  saleCommercialLabel,
  saleFinancialStatus,
  saleNet,
} from "../../domain/rules/finance";
import { money } from "../../utils/currency";
import { formatDateTime } from "../../utils/dates";

export const paymentLabel = (sale: Sale) =>
  sale.paymentMode === "immediate" ? (sale.paymentMethod ?? "—") : "A prazo";

export function SalesTable({
  sales,
  pageSize = 10,
  showCustomer = true,
  empty,
}: {
  sales: Sale[];
  pageSize?: number;
  showCustomer?: boolean;
  empty?: string;
}) {
  const { state } = useStore();
  const pagination = usePagination(sales, pageSize);
  if (!sales.length)
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Nenhuma venda encontrada"
        text={empty ?? "Ajuste os filtros ou registre uma nova venda."}
      />
    );
  return (
    <>
      <DataTable
        headers={[
          "Venda",
          ...(showCustomer ? ["Cliente"] : []),
          "Vendedor",
          "Data e hora",
          "Pagamento",
          "Valor líquido",
          "Saldo",
          "Situação",
          "Financeiro",
        ]}
      >
        {pagination.pageItems.map((sale) => {
          const balance = saleBalance(state, sale);
          return (
            <tr key={sale.id}>
              <td>
                <SaleLink id={sale.id} />
              </td>
              {showCustomer && (
                <td>
                  <CustomerLink id={sale.customerId} />
                </td>
              )}
              <td>{sale.sellerName}</td>
              <td>{formatDateTime(sale.at)}</td>
              <td>{paymentLabel(sale)}</td>
              <td>
                <strong>{money(saleNet(state, sale))}</strong>
              </td>
              <td>{sale.closingId ? "Em fechamento" : money(balance)}</td>
              <td>
                <Status value={saleCommercialLabel(state, sale)} />
              </td>
              <td>
                <Status value={saleFinancialStatus(state, sale)} />
              </td>
            </tr>
          );
        })}
      </DataTable>
      <Pagination {...pagination} />
    </>
  );
}
