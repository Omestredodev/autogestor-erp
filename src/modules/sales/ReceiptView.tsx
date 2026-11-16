import { Car } from "lucide-react";
import type { Sale } from "../../domain/types";
import { useStore } from "../../store/AppProvider";
import { byId, customerName, userName } from "../../store/selectors";
import {
  netPaid,
  returnedQuantity,
  saleBalance,
  saleGross,
  saleNet,
  saleReturnedValue,
  salePayments,
  saleReferenceTotal,
  saleFinancialStatus,
} from "../../domain/rules/finance";
import { money } from "../../utils/currency";
import { formatDate, formatDateTime } from "../../utils/dates";
import { paymentLabel } from "./SalesTable";

/** Internal receipt built from the persisted sale record (not a fiscal document). */
export function ReceiptView({ sale }: { sale: Sale }) {
  const { state } = useStore();
  const returned = saleReturnedValue(state, sale);
  const adjustment = saleGross(sale) - saleReferenceTotal(sale);
  const payments = salePayments(state, sale.id);
  const closing = byId(state.closings, sale.closingId);
  return (
    <div className="receipt printable">
      <div className="receipt-head">
        <span>
          <Car size={18} />
        </span>
        <div>
          <strong>{state.settings.tradeName}</strong>
          <small>
            {state.settings.document} · {state.settings.phone}
          </small>
        </div>
      </div>
      <div className="receipt-title">
        <strong>COMPROVANTE INTERNO · {sale.number}</strong>
        <small>Sem valor fiscal · {formatDateTime(sale.at)}</small>
        {sale.status === "cancelled" && <b className="receipt-cancelled">VENDA CANCELADA</b>}
      </div>
      <div className="receipt-lines">
        {sale.items.map((item) => {
          const back = returnedQuantity(state, item.id);
          return (
            <div key={item.id}>
              <span>
                {item.quantity}× {item.code} {item.name}
                <small>
                  {money(item.price)} un.
                  {item.price !== item.referencePrice
                    ? ` (ref. ${money(item.referencePrice)})`
                    : ""}
                  {back > 0 ? ` · devolvido ${back}` : ""}
                </small>
              </span>
              <strong>{money(item.quantity * item.price)}</strong>
            </div>
          );
        })}
      </div>
      <hr />
      <div className="receipt-row">
        <span>Valor original</span>
        <strong>{money(saleGross(sale))}</strong>
      </div>
      {Math.abs(adjustment) > 0.004 && (
        <div className="receipt-row">
          <span>{adjustment < 0 ? "Desconto sobre referência" : "Acréscimo sobre referência"}</span>
          <strong>{money(adjustment)}</strong>
        </div>
      )}
      {returned > 0 && (
        <div className="receipt-row">
          <span>Devolvido</span>
          <strong>− {money(returned)}</strong>
        </div>
      )}
      <div className="receipt-row total">
        <span>{sale.status === "cancelled" ? "Valor válido" : "Valor líquido"}</span>
        <strong>{money(saleNet(state, sale))}</strong>
      </div>
      <hr />
      <div className="receipt-row">
        <span>Cliente</span>
        <strong>{customerName(state, sale.customerId)}</strong>
      </div>
      <div className="receipt-row">
        <span>Vendedor</span>
        <strong>{sale.sellerName}</strong>
      </div>
      <div className="receipt-row">
        <span>Pagamento</span>
        <strong>
          {paymentLabel(sale)}
          {sale.dueDate ? ` · venc. ${formatDate(`${sale.dueDate}T12:00:00`)}` : ""}
        </strong>
      </div>
      {payments.map((payment) => (
        <div className="receipt-row" key={payment.id}>
          <span>
            {payment.kind === "receipt" ? "Recebido" : "Reembolsado"} {formatDate(payment.at)} (
            {payment.method}) · {userName(state, payment.userId)}
          </span>
          <strong>
            {payment.kind === "refund" ? "− " : ""}
            {money(payment.amount)}
          </strong>
        </div>
      ))}
      <div className="receipt-row">
        <span>Situação financeira</span>
        <strong>
          {saleFinancialStatus(state, sale)}
          {closing ? ` (${closing.number})` : ` · saldo ${money(saleBalance(state, sale))}`}
        </strong>
      </div>
      {payments.length > 0 && (
        <small className="receipt-foot">Total líquido pago: {money(netPaid(payments))}</small>
      )}
      {sale.notes && <p className="receipt-notes">Obs.: {sale.notes}</p>}
    </div>
  );
}
