import { useMemo, useState } from "react";
import {
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  ReceiptText,
  RotateCcw,
} from "lucide-react";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  MiniStat,
  Notice,
  Pagination,
  Select,
  Status,
  Tabs,
  usePagination,
} from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { CustomerLink, RecordLink, SaleLink } from "../../components/shared/Links";
import { useDeny } from "../../components/shared/permissions";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId, receiptsIn, revenueIn, userName } from "../../store/selectors";
import {
  activeReceivables,
  closingBalance,
  pendingRefunds,
  saleNet,
  totalReceivable,
  type ReceivableView,
} from "../../domain/rules/finance";
import { sumBy } from "../../utils/calculations";
import { money } from "../../utils/currency";
import {
  formatDate,
  formatDateTime,
  inRange,
  periodLabels,
  periodRange,
  type PeriodKey,
} from "../../utils/dates";

const TABS = [
  "Contas a receber",
  "Pagamentos registrados",
  "Fechamentos pendentes",
  "Reembolsos pendentes",
  "Histórico por cliente",
] as const;
type Tab = (typeof TABS)[number];

export function FinancePage() {
  const { state } = useStore();
  const { route, replace, open } = useNavigation();
  const deny = useDeny();
  const tab = (TABS.includes(route.tab as Tab) ? route.tab : TABS[0]) as Tab;
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customerId, setCustomerId] = useState("all");
  const [status, setStatus] = useState("open");
  const range = periodRange(period);
  const now = new Date();
  const byCustomer = <T extends { customerId: string }>(item: T) =>
    customerId === "all" || item.customerId === customerId;

  const receivables = useMemo(
    () =>
      activeReceivables(state)
        .filter((view) => byCustomer(view.receivable))
        .filter((view) =>
          status === "open"
            ? view.balance > 0.005
            : status === "all"
              ? true
              : view.status === status,
        )
        .sort((a, b) => a.receivable.dueDate.localeCompare(b.receivable.dueDate)),
    [state, customerId, status], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const payments = useMemo(
    () =>
      state.payments
        .filter((payment) => inRange(payment.at, range) && byCustomer(payment))
        .sort((a, b) => b.at.localeCompare(a.at)),
    [state, period, customerId],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const refunds = pendingRefunds(state).filter(byCustomer);
  const openClosings = state.closings.filter(
    (closing) => closingBalance(state, closing) > 0.005 && byCustomer(closing),
  );
  const receivablePagination = usePagination(receivables, 10);
  const paymentPagination = usePagination(payments, 10);
  const customerRows = state.customers
    .filter((customer) => !customer.generic && byCustomer({ customerId: customer.id }))
    .map((customer) => {
      const sales = state.sales.filter(
        (sale) => sale.customerId === customer.id && inRange(sale.at, range),
      );
      const customerPayments = state.payments.filter(
        (payment) => payment.customerId === customer.id && inRange(payment.at, range),
      );
      return {
        customer,
        revenue: sumBy(sales, (sale) => saleNet(state, sale)),
        received: sumBy(customerPayments, (payment) =>
          payment.kind === "receipt" ? payment.amount : -payment.amount,
        ),
        open: sumBy(
          activeReceivables(state).filter((view) => view.receivable.customerId === customer.id),
          (view) => Math.max(0, view.balance),
        ),
      };
    })
    .filter((row) => row.revenue || row.received || row.open);

  const originLink = (view: ReceivableView) =>
    view.receivable.origin === "sale" && view.receivable.saleId ? (
      <SaleLink id={view.receivable.saleId} />
    ) : (
      <RecordLink route={{ page: "closings", id: view.receivable.closingId }}>
        {byId(state.closings, view.receivable.closingId ?? "")?.number}
      </RecordLink>
    );

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Recebimentos, valores em aberto e histórico financeiro"
      />
      <div className="page-stack">
        <section className="mini-stats">
          <MiniStat
            label={`Faturamento comercial · ${periodLabels[period]}`}
            value={money(revenueIn(state, range))}
            icon={ReceiptText}
            hint="Vendas válidas, líquidas de devoluções"
          />
          <MiniStat
            label={`Recebimentos · ${periodLabels[period]}`}
            value={money(receiptsIn(state, range))}
            icon={CircleDollarSign}
            tone="success"
            hint="Pagamentos menos reembolsos efetivados"
          />
          <MiniStat
            label="Contas a receber (atual)"
            value={money(totalReceivable(state))}
            icon={CalendarClock}
            tone="warning"
            onClick={() => replace({ ...route, tab: "Contas a receber" })}
          />
          <MiniStat
            label="Reembolsos pendentes"
            value={money(sumBy(pendingRefunds(state), (item) => item.amount))}
            icon={RotateCcw}
            tone="danger"
            onClick={() => replace({ ...route, tab: "Reembolsos pendentes" })}
          />
        </section>
        <Notice title="Faturamento ≠ recebimento">
          Vendas a prazo aumentam o faturamento sem aumentar os recebimentos. Devoluções geram
          reembolso ou crédito sem apagar pagamentos históricos.
        </Notice>
        <Card className="table-card">
          <Tabs
            tabs={TABS}
            value={tab}
            onChange={(next) => replace({ ...route, tab: next })}
            counts={{
              "Contas a receber": activeReceivables(state).filter((view) => view.balance > 0.005)
                .length,
              "Fechamentos pendentes": openClosings.length,
              "Reembolsos pendentes": refunds.length,
            }}
          />
          <div className="filter-row">
            <Select
              label="Período"
              value={period}
              onChange={setPeriod}
              options={(Object.keys(periodLabels) as PeriodKey[]).map((value) => ({
                value,
                label: periodLabels[value],
              }))}
            />
            <Select
              label="Cliente"
              value={customerId}
              onChange={setCustomerId}
              options={[
                { value: "all", label: "Todos os clientes" },
                ...state.customers
                  .filter((item) => !item.generic)
                  .map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
            {tab === "Contas a receber" && (
              <Select
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "open", label: "Com saldo pendente" },
                  { value: "Em aberto", label: "Em aberto" },
                  { value: "Parcialmente pago", label: "Parcialmente pago" },
                  { value: "Pago", label: "Pago" },
                  { value: "all", label: "Todos" },
                ]}
              />
            )}
          </div>
          {tab === "Contas a receber" &&
            (receivables.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="Nenhuma conta a receber"
                text="Nenhum título corresponde aos filtros."
              />
            ) : (
              <>
                <div className="result-count">
                  <strong>{receivables.length} título(s)</strong>
                  <span>
                    Saldo filtrado: {money(sumBy(receivables, (view) => Math.max(0, view.balance)))}
                  </span>
                </div>
                <DataTable
                  headers={[
                    "Título",
                    "Cliente",
                    "Origem",
                    "Vencimento",
                    "Valor",
                    "Recebido",
                    "Saldo",
                    "Status",
                    "",
                  ]}
                >
                  {receivablePagination.pageItems.map((view) => {
                    const overdue =
                      view.balance > 0.005 && new Date(`${view.receivable.dueDate}T23:59:59`) < now;
                    const target =
                      view.receivable.origin === "sale"
                        ? { saleId: view.receivable.saleId! }
                        : { closingId: view.receivable.closingId! };
                    return (
                      <tr key={view.receivable.id}>
                        <td>{view.receivable.number}</td>
                        <td>
                          <CustomerLink id={view.receivable.customerId} />
                        </td>
                        <td>{originLink(view)}</td>
                        <td className={overdue ? "qty-negative" : ""}>
                          {formatDate(`${view.receivable.dueDate}T12:00:00`)}
                          {overdue ? " · vencido" : ""}
                        </td>
                        <td>{money(view.total)}</td>
                        <td>{money(view.received)}</td>
                        <td>
                          <strong>{money(view.balance)}</strong>
                        </td>
                        <td>
                          <Status value={overdue ? "Vencido" : view.status} />
                        </td>
                        <td>
                          {view.balance > 0.005 && (
                            <Button
                              small
                              variant="success"
                              onClick={() => open({ type: "payment", target, mode: "receipt" })}
                              disabledReason={deny("finance.manage")}
                            >
                              Receber
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </DataTable>
                <Pagination {...receivablePagination} />
              </>
            ))}
          {tab === "Pagamentos registrados" &&
            (payments.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="Nenhum pagamento no período"
                text="Ajuste o período ou o cliente."
              />
            ) : (
              <>
                <div className="result-count">
                  <strong>{payments.length} lançamento(s)</strong>
                  <span>
                    Recebido líquido:{" "}
                    {money(
                      sumBy(payments, (payment) =>
                        payment.kind === "receipt" ? payment.amount : -payment.amount,
                      ),
                    )}
                  </span>
                </div>
                <DataTable
                  headers={[
                    "Lançamento",
                    "Tipo",
                    "Data",
                    "Cliente",
                    "Origem",
                    "Forma",
                    "Valor",
                    "Responsável",
                  ]}
                >
                  {paymentPagination.pageItems.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.number}</td>
                      <td>
                        <Status
                          value={payment.kind === "receipt" ? "Recebimento" : "Reembolso"}
                          tone={payment.kind === "receipt" ? "success" : "warning"}
                        />
                      </td>
                      <td>{formatDateTime(payment.at)}</td>
                      <td>
                        <CustomerLink id={payment.customerId} />
                      </td>
                      <td>
                        {payment.saleId ? (
                          <SaleLink id={payment.saleId} />
                        ) : (
                          <RecordLink route={{ page: "closings", id: payment.closingId }}>
                            {byId(state.closings, payment.closingId ?? "")?.number}
                          </RecordLink>
                        )}
                      </td>
                      <td>{payment.method}</td>
                      <td>
                        <strong>
                          {payment.kind === "refund" ? "− " : ""}
                          {money(payment.amount)}
                        </strong>
                      </td>
                      <td>{userName(state, payment.userId)}</td>
                    </tr>
                  ))}
                </DataTable>
                <Pagination {...paymentPagination} />
              </>
            ))}
          {tab === "Fechamentos pendentes" &&
            (openClosings.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nenhum fechamento pendente"
                text="Todos os fechamentos estão quitados."
              />
            ) : (
              <DataTable headers={["Fechamento", "Cliente", "Vencimento", "Saldo", ""]}>
                {openClosings.map((closing) => (
                  <tr key={closing.id}>
                    <td>
                      <RecordLink route={{ page: "closings", id: closing.id }}>
                        {closing.number}
                      </RecordLink>
                    </td>
                    <td>
                      <CustomerLink id={closing.customerId} />
                    </td>
                    <td>{formatDate(`${closing.dueDate}T12:00:00`)}</td>
                    <td>
                      <strong>{money(closingBalance(state, closing))}</strong>
                    </td>
                    <td>
                      <Button
                        small
                        variant="success"
                        onClick={() =>
                          open({
                            type: "payment",
                            target: { closingId: closing.id },
                            mode: "receipt",
                          })
                        }
                        disabledReason={deny("finance.manage")}
                      >
                        Receber
                      </Button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            ))}
          {tab === "Reembolsos pendentes" &&
            (refunds.length === 0 ? (
              <EmptyState
                icon={RotateCcw}
                title="Nenhum reembolso pendente"
                text="Devoluções e cancelamentos com valores pagos aparecerão aqui."
              />
            ) : (
              <DataTable headers={["Origem", "Cliente", "Valor a devolver", ""]}>
                {refunds.map((refund) => (
                  <tr key={refund.key}>
                    <td>
                      {refund.saleId ? (
                        <SaleLink id={refund.saleId} />
                      ) : (
                        <RecordLink route={{ page: "closings", id: refund.closingId }}>
                          {byId(state.closings, refund.closingId ?? "")?.number}
                        </RecordLink>
                      )}
                    </td>
                    <td>
                      <CustomerLink id={refund.customerId} />
                    </td>
                    <td>
                      <strong className="qty-negative">{money(refund.amount)}</strong>
                    </td>
                    <td>
                      <Button
                        small
                        onClick={() =>
                          open({
                            type: "payment",
                            target: refund.saleId
                              ? { saleId: refund.saleId }
                              : { closingId: refund.closingId! },
                            mode: "refund",
                          })
                        }
                        disabledReason={deny("finance.manage")}
                      >
                        Registrar reembolso
                      </Button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            ))}
          {tab === "Histórico por cliente" &&
            (customerRows.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="Sem movimentação"
                text="Nenhum cliente com movimentação no período."
              />
            ) : (
              <DataTable
                headers={[
                  "Cliente",
                  `Faturado (${periodLabels[period]})`,
                  `Recebido (${periodLabels[period]})`,
                  "Saldo em aberto atual",
                ]}
              >
                {customerRows.map((row) => (
                  <tr key={row.customer.id}>
                    <td>
                      <RecordLink
                        route={{ page: "clients", id: row.customer.id, tab: "Pagamentos" }}
                      >
                        {row.customer.name}
                      </RecordLink>
                    </td>
                    <td>{money(row.revenue)}</td>
                    <td>{money(row.received)}</td>
                    <td>
                      <strong>{money(row.open)}</strong>
                    </td>
                  </tr>
                ))}
              </DataTable>
            ))}
        </Card>
      </div>
    </>
  );
}
