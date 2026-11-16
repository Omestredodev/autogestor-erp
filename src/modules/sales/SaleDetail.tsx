import {
  Bell,
  CreditCard,
  History,
  Printer,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Undo2,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  InfoSection,
  Notice,
  Status,
  Tabs,
} from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { CustomerLink, ProductLink, RecordLink } from "../../components/shared/Links";
import { useDeny } from "../../components/shared/permissions";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId, relatedAudit, userName } from "../../store/selectors";
import {
  availableToReturn,
  closingBalance,
  closingPayments,
  netPaid,
  returnedQuantity,
  saleBalance,
  saleCommercialLabel,
  saleFinancialStatus,
  saleGross,
  saleNet,
  salePayments,
  saleReferenceTotal,
  saleReturnedValue,
  saleReturns,
} from "../../domain/rules/finance";
import { money } from "../../utils/currency";
import { formatDate, formatDateTime } from "../../utils/dates";
import { AuditTable } from "../audit/AuditTable";
import { paymentLabel } from "./SalesTable";

const TABS = ["Itens", "Pagamentos", "Histórico", "Devoluções"] as const;
type Tab = (typeof TABS)[number];

export function SaleDetail({ id }: { id: string }) {
  const { state } = useStore();
  const { route, replace, open, navigate } = useNavigation();
  const deny = useDeny();
  const sale = byId(state.sales, id);
  if (!sale) {
    return (
      <>
        <PageHeader title="Venda não encontrada" backTo={{ page: "sales" }} />
        <Card>
          <EmptyState
            icon={ShoppingCart}
            title="Registro inexistente"
            text="Esta venda não existe nos dados atuais."
          />
        </Card>
      </>
    );
  }
  const tab = (TABS.includes(route.tab as Tab) ? route.tab : TABS[0]) as Tab;
  const returns = saleReturns(state, id);
  const payments = salePayments(state, id);
  const closing = byId(state.closings, sale.closingId);
  const balance = saleBalance(state, sale);
  const cancelled = sale.status === "cancelled";
  const returnable = sale.items.some((item) => availableToReturn(state, item) > 0);
  const adjustment = saleGross(sale) - saleReferenceTotal(sale);

  return (
    <>
      <PageHeader
        title={`Venda ${sale.number}`}
        subtitle={`${formatDateTime(sale.at)} · ${sale.customerName} · ${sale.sellerName}`}
        record={sale.number}
        backTo={{ page: "sales" }}
        actions={
          <>
            <Button
              variant="secondary"
              icon={Printer}
              onClick={() => open({ type: "receipt", saleId: id })}
            >
              Comprovante
            </Button>
            {!cancelled && (
              <Button
                variant="secondary"
                icon={Undo2}
                onClick={() => open({ type: "sale-return", saleId: id })}
                disabledReason={
                  deny("sales.return") ??
                  (returnable ? undefined : "Todos os itens já foram devolvidos")
                }
              >
                Registrar devolução
              </Button>
            )}
            {!cancelled && (
              <Button
                variant="danger"
                icon={X}
                onClick={() => open({ type: "sale-cancel", saleId: id })}
                disabledReason={deny("sales.cancel")}
              >
                Cancelar venda
              </Button>
            )}
          </>
        }
      />
      <div className="page-stack">
        {cancelled && (
          <Notice
            title={`Venda CANCELADA em ${formatDateTime(sale.cancelledAt)} por ${userName(state, sale.cancelledBy)}`}
            tone="danger"
          >
            Motivo: {sale.cancelReason}. A venda e seus itens permanecem no histórico; o estoque não
            devolvido foi revertido.
          </Notice>
        )}
        <Card className="sale-summary-card">
          <div className="sale-detail-head">
            <div>
              <small>Cliente</small>
              <strong>
                <CustomerLink id={sale.customerId} />
              </strong>
            </div>
            <div>
              <small>Vendedor</small>
              <strong>{sale.sellerName}</strong>
            </div>
            <div>
              <small>Pagamento</small>
              <strong>
                {paymentLabel(sale)}
                {sale.dueDate ? ` · venc. ${formatDate(`${sale.dueDate}T12:00:00`)}` : ""}
              </strong>
            </div>
            <div>
              <small>Valor líquido</small>
              <strong>{money(saleNet(state, sale))}</strong>
            </div>
            <div className="status-row">
              <Status value={saleCommercialLabel(state, sale)} />
              <Status value={saleFinancialStatus(state, sale)} />
            </div>
          </div>
          <div className="value-strip">
            <div>
              <span>Preço de referência</span>
              <strong>{money(saleReferenceTotal(sale))}</strong>
            </div>
            <div>
              <span>{adjustment < 0 ? "Desconto praticado" : "Acréscimo praticado"}</span>
              <strong>{money(adjustment)}</strong>
            </div>
            <div>
              <span>Valor original</span>
              <strong>{money(saleGross(sale))}</strong>
            </div>
            <div>
              <span>Devolvido</span>
              <strong>− {money(saleReturnedValue(state, sale))}</strong>
            </div>
            <div>
              <span>Pago (líquido)</span>
              <strong>{money(netPaid(payments))}</strong>
            </div>
            <div>
              <span>{balance < 0 ? "Reembolso pendente" : "Saldo"}</span>
              <strong className={balance < -0.004 ? "qty-negative" : ""}>
                {closing ? `Em ${closing.number}` : money(Math.abs(balance))}
              </strong>
            </div>
          </div>
          {sale.notes && <p className="sale-notes">Observações: {sale.notes}</p>}
          <Tabs
            tabs={TABS}
            value={tab}
            onChange={(next) => replace({ ...route, tab: next })}
            counts={{ Pagamentos: payments.length, Devoluções: returns.length }}
          />
          {tab === "Itens" && (
            <DataTable
              headers={[
                "Código",
                "Produto",
                "Quantidade",
                "Devolvida",
                "Qtd. líquida",
                "Custo na venda",
                "Preço referência",
                "Preço praticado",
                "Subtotal",
              ]}
            >
              {sale.items.map((item) => {
                const back = returnedQuantity(state, item.id);
                return (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>
                      <ProductLink
                        id={item.productId}
                        label={item.name}
                        sub={item.manufacturerCode}
                      />
                    </td>
                    <td>{item.quantity}</td>
                    <td>{back || "—"}</td>
                    <td>{item.quantity - back}</td>
                    <td>{money(item.unitCost)}</td>
                    <td>{money(item.referencePrice)}</td>
                    <td
                      className={
                        item.price < item.referencePrice
                          ? "qty-negative"
                          : item.price > item.referencePrice
                            ? "qty-positive"
                            : ""
                      }
                    >
                      {money(item.price)}
                    </td>
                    <td>
                      <strong>{money(item.quantity * item.price)}</strong>
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          )}
          {tab === "Pagamentos" && (
            <div className="tab-content">
              <div className="tab-toolbar">
                {!closing && balance > 0.004 && (
                  <Button
                    small
                    variant="success"
                    icon={CreditCard}
                    onClick={() =>
                      open({ type: "payment", target: { saleId: id }, mode: "receipt" })
                    }
                    disabledReason={deny("finance.manage")}
                  >
                    Registrar pagamento
                  </Button>
                )}
                {!closing && balance < -0.004 && (
                  <Button
                    small
                    icon={RotateCcw}
                    onClick={() =>
                      open({ type: "payment", target: { saleId: id }, mode: "refund" })
                    }
                    disabledReason={deny("finance.manage")}
                  >
                    Registrar reembolso de {money(-balance)}
                  </Button>
                )}
              </div>
              {closing && (
                <Notice title={`Venda incluída no fechamento ${closing.number}`}>
                  Os pagamentos são registrados no fechamento. Saldo atual do fechamento:{" "}
                  {money(closingBalance(state, closing))}.{" "}
                  <RecordLink route={{ page: "closings", id: closing.id }}>
                    Abrir fechamento
                  </RecordLink>
                </Notice>
              )}
              {payments.length === 0 && !closing ? (
                <EmptyState
                  icon={CreditCard}
                  title="Nenhum pagamento registrado"
                  text={
                    sale.paymentMode === "deferred"
                      ? "Venda a prazo aguardando pagamento."
                      : "Sem lançamentos."
                  }
                />
              ) : (
                <DataTable
                  headers={[
                    "Lançamento",
                    "Tipo",
                    "Data",
                    "Forma",
                    "Valor",
                    "Usuário",
                    "Observações",
                  ]}
                >
                  {[...payments, ...(closing ? closingPayments(state, closing.id) : [])].map(
                    (payment) => (
                      <tr key={payment.id}>
                        <td>{payment.number}</td>
                        <td>
                          <Status
                            value={
                              payment.kind === "receipt"
                                ? payment.closingId
                                  ? "Pago no fechamento"
                                  : "Recebimento"
                                : "Reembolso"
                            }
                            tone={payment.kind === "receipt" ? "success" : "warning"}
                          />
                        </td>
                        <td>{formatDateTime(payment.at)}</td>
                        <td>{payment.method}</td>
                        <td>
                          <strong>
                            {payment.kind === "refund" ? "− " : ""}
                            {money(payment.amount)}
                          </strong>
                        </td>
                        <td>{userName(state, payment.userId)}</td>
                        <td className="wrap-cell">{payment.notes || "—"}</td>
                      </tr>
                    ),
                  )}
                </DataTable>
              )}
            </div>
          )}
          {tab === "Histórico" && (
            <div className="tab-content">
              <div className="tab-toolbar">
                <Button
                  small
                  variant="secondary"
                  icon={Bell}
                  onClick={() =>
                    open({
                      type: "reminder-form",
                      saleId: id,
                      customerId: byId(state.customers, sale.customerId)?.generic
                        ? undefined
                        : sale.customerId,
                    })
                  }
                  disabledReason={deny("reminders.manage")}
                >
                  Criar lembrete
                </Button>
                <Button
                  small
                  variant="secondary"
                  icon={ShieldCheck}
                  onClick={() => navigate({ page: "audit", params: { query: sale.number } })}
                  disabledReason={deny("audit.view")}
                >
                  Abrir na auditoria
                </Button>
              </div>
              <AuditTable events={relatedAudit(state, id)} compact />
            </div>
          )}
          {tab === "Devoluções" && (
            <div className="tab-content">
              {returns.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Nenhuma devolução"
                  text="As devoluções desta venda aparecerão aqui e permanecem visíveis após outras operações."
                />
              ) : (
                returns.map((saleReturn) => (
                  <div className="return-card" key={saleReturn.id}>
                    <header>
                      <strong>{saleReturn.number}</strong>
                      <span>
                        {formatDateTime(saleReturn.at)} · {userName(state, saleReturn.userId)} ·
                        Motivo: {saleReturn.reason}
                      </span>
                    </header>
                    <DataTable headers={["Produto", "Quantidade", "Preço", "Valor devolvido"]}>
                      {saleReturn.items.map((item) => {
                        const saleItem = sale.items.find((line) => line.id === item.saleItemId);
                        return (
                          <tr key={item.saleItemId}>
                            <td>
                              <ProductLink
                                id={item.productId}
                                label={saleItem?.name}
                                sub={saleItem?.code}
                              />
                            </td>
                            <td>{item.quantity}</td>
                            <td>{money(item.unitPrice)}</td>
                            <td>{money(item.quantity * item.unitPrice)}</td>
                          </tr>
                        );
                      })}
                    </DataTable>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>
        <div className="info-grid no-pad">
          <InfoSection
            title="Registro"
            values={[
              ["Número", sale.number],
              ["Data e hora", formatDateTime(sale.at)],
              ["Vendedor", sale.sellerName],
              [
                "Fechamento",
                closing ? (
                  <RecordLink key="c" route={{ page: "closings", id: closing.id }}>
                    {closing.number}
                  </RecordLink>
                ) : (
                  "—"
                ),
              ],
            ]}
          />
          <InfoSection
            title="Situação"
            values={[
              ["Comercial", saleCommercialLabel(state, sale)],
              ["Financeira", saleFinancialStatus(state, sale)],
              [
                "Cancelamento",
                cancelled ? `${formatDateTime(sale.cancelledAt)} — ${sale.cancelReason}` : "—",
              ],
              ["Devoluções", returns.length ? returns.map((item) => item.number).join(", ") : "—"],
            ]}
          />
        </div>
      </div>
    </>
  );
}
