import type { AppState, Closing, Customer, Payment, Receivable, Sale, SaleItem } from "../types";
import { round2 } from "../../utils/currency";
import { sumBy } from "../../utils/calculations";

const EPS = 0.005;

export const itemTotal = (item: Pick<SaleItem, "quantity" | "price">) =>
  round2(item.quantity * item.price);

export const saleGross = (sale: Sale) => sumBy(sale.items, itemTotal);

export const saleReferenceTotal = (sale: Sale) =>
  sumBy(sale.items, (item) => item.quantity * item.referencePrice);

export const saleReturns = (state: AppState, saleId: string) =>
  state.returns.filter((item) => item.saleId === saleId);

export function returnedQuantity(state: AppState, saleItemId: string) {
  let total = 0;
  for (const saleReturn of state.returns) {
    for (const item of saleReturn.items) if (item.saleItemId === saleItemId) total += item.quantity;
  }
  return total;
}

export const availableToReturn = (state: AppState, item: SaleItem) =>
  item.quantity - returnedQuantity(state, item.id);

export const saleReturnedValue = (state: AppState, sale: Sale) =>
  sumBy(saleReturns(state, sale.id), (saleReturn) =>
    sumBy(saleReturn.items, (item) => item.quantity * item.unitPrice),
  );

/** Commercial value after returns, ignoring cancellation. */
export const saleValueAfterReturns = (state: AppState, sale: Sale) =>
  round2(saleGross(sale) - saleReturnedValue(state, sale));

/** Valid commercial value: zero when cancelled. */
export const saleNet = (state: AppState, sale: Sale) =>
  sale.status === "cancelled" ? 0 : saleValueAfterReturns(state, sale);

export const netPaid = (payments: Payment[]) =>
  round2(
    payments.reduce(
      (total, payment) => total + (payment.kind === "receipt" ? payment.amount : -payment.amount),
      0,
    ),
  );

export const salePayments = (state: AppState, saleId: string) =>
  state.payments.filter((payment) => payment.saleId === saleId);

export const closingPayments = (state: AppState, closingId: string) =>
  state.payments.filter((payment) => payment.closingId === closingId);

/** Positive = still receivable; negative = refund/credit owed to the customer. */
export const saleBalance = (state: AppState, sale: Sale) =>
  round2(saleNet(state, sale) - netPaid(salePayments(state, sale.id)));

export const closingTotal = (state: AppState, closing: Closing) =>
  sumBy(closing.saleIds, (saleId) => {
    const sale = state.sales.find((item) => item.id === saleId);
    return sale ? saleBalance(state, sale) : 0;
  });

export const closingPaid = (state: AppState, closing: Closing) =>
  netPaid(closingPayments(state, closing.id));

export const closingBalance = (state: AppState, closing: Closing) =>
  round2(closingTotal(state, closing) - closingPaid(state, closing));

export type FinancialStatus =
  | "Em aberto"
  | "Parcialmente pago"
  | "Pago"
  | "Reembolso pendente"
  | "Sem saldo";

function statusFrom(balance: number, paid: number, total: number): FinancialStatus {
  if (balance < -EPS) return "Reembolso pendente";
  if (balance > EPS) return paid > EPS ? "Parcialmente pago" : "Em aberto";
  return total > EPS || paid > EPS ? "Pago" : "Sem saldo";
}

export const closingStatus = (state: AppState, closing: Closing) =>
  statusFrom(
    closingBalance(state, closing),
    closingPaid(state, closing),
    closingTotal(state, closing),
  );

export function saleFinancialStatus(
  state: AppState,
  sale: Sale,
): FinancialStatus | "Em fechamento" {
  if (sale.closingId) {
    const closing = state.closings.find((item) => item.id === sale.closingId);
    if (closing && closingBalance(state, closing) > EPS) return "Em fechamento";
    return closing ? closingStatus(state, closing) : "Em fechamento";
  }
  const paid = netPaid(salePayments(state, sale.id));
  return statusFrom(saleBalance(state, sale), paid, saleNet(state, sale));
}

export function saleCommercialLabel(state: AppState, sale: Sale) {
  if (sale.status === "cancelled") return "Cancelada";
  const returned = saleReturnedValue(state, sale);
  if (returned > EPS) return returned >= saleGross(sale) - EPS ? "Devolvida" : "Devolução parcial";
  return "Concluída";
}

export const isSaleEligibleForClosing = (state: AppState, sale: Sale, customer?: Customer) =>
  sale.status === "valid" &&
  !sale.closingId &&
  !customer?.generic &&
  saleBalance(state, sale) > EPS;

export interface ReceivableView {
  receivable: Receivable;
  total: number;
  received: number;
  balance: number;
  status: FinancialStatus;
}

export function receivableView(state: AppState, receivable: Receivable): ReceivableView {
  if (receivable.origin === "closing") {
    const closing = state.closings.find((item) => item.id === receivable.closingId);
    const total = closing ? closingTotal(state, closing) : 0;
    const received = closing ? closingPaid(state, closing) : 0;
    const balance = round2(total - received);
    return { receivable, total, received, balance, status: statusFrom(balance, received, total) };
  }
  const sale = state.sales.find((item) => item.id === receivable.saleId);
  const total = sale ? saleNet(state, sale) : 0;
  const received = sale ? netPaid(salePayments(state, sale.id)) : 0;
  const balance = round2(total - received);
  return { receivable, total, received, balance, status: statusFrom(balance, received, total) };
}

export const activeReceivables = (state: AppState) =>
  state.receivables
    .filter((receivable) => !receivable.supersededByClosingId)
    .map((item) => receivableView(state, item));

export interface RefundPending {
  key: string;
  customerId: string;
  saleId?: string;
  closingId?: string;
  amount: number;
}

export function pendingRefunds(state: AppState): RefundPending[] {
  const pending: RefundPending[] = [];
  for (const sale of state.sales) {
    if (sale.closingId) continue;
    const balance = saleBalance(state, sale);
    if (balance < -EPS)
      pending.push({
        key: sale.id,
        customerId: sale.customerId,
        saleId: sale.id,
        amount: -balance,
      });
  }
  for (const closing of state.closings) {
    const balance = closingBalance(state, closing);
    if (balance < -EPS)
      pending.push({
        key: closing.id,
        customerId: closing.customerId,
        closingId: closing.id,
        amount: -balance,
      });
  }
  return pending;
}

export const totalReceivable = (state: AppState) =>
  sumBy(activeReceivables(state), (item) => Math.max(0, item.balance));

export function customerOpenBalance(state: AppState, customerId: string) {
  return sumBy(
    activeReceivables(state).filter((item) => item.receivable.customerId === customerId),
    (item) => Math.max(0, item.balance),
  );
}
