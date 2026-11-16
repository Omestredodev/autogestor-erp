import { useMemo, useState } from "react";
import { ClipboardCheck, CreditCard, RotateCcw, Users } from "lucide-react";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorBanner,
  Field,
  InfoSection,
  Notice,
  Pagination,
  Select,
  Status,
  usePagination,
} from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { CustomerLink, RecordLink, SaleLink } from "../../components/shared/Links";
import { useCommand } from "../../components/shared/useCommand";
import { useDeny } from "../../components/shared/permissions";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId, customerName, userName } from "../../store/selectors";
import {
  closingBalance,
  closingPaid,
  closingPayments,
  closingStatus,
  closingTotal,
  isSaleEligibleForClosing,
  saleBalance,
  saleCommercialLabel,
  saleGross,
  saleNet,
  saleReturnedValue,
} from "../../domain/rules/finance";
import { sumBy } from "../../utils/calculations";
import { money } from "../../utils/currency";
import { addDays, formatDate, formatDateTime, toInputDate } from "../../utils/dates";

export function ClosingsPage() {
  const { route } = useNavigation();
  return route.id ? <ClosingDetail id={route.id} /> : <ClosingsHome />;
}

function ClosingsHome() {
  const { state } = useStore();
  const { route, navigate } = useNavigation();
  const deny = useDeny();
  const { execute, busy, error } = useCommand();
  const eligibleCustomers = state.customers.filter(
    (customer) =>
      !customer.generic &&
      state.sales.some(
        (sale) =>
          sale.customerId === customer.id && isSaleEligibleForClosing(state, sale, customer),
      ),
  );
  const [customerId, setCustomerId] = useState(
    route.params?.customerId ?? eligibleCustomers[0]?.id ?? "",
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(toInputDate(addDays(new Date(), 10)));
  const [notes, setNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const customer = byId(state.customers, customerId);
  const eligible = state.sales
    .filter(
      (sale) => sale.customerId === customerId && isSaleEligibleForClosing(state, sale, customer),
    )
    .sort((a, b) => a.at.localeCompare(b.at));
  const chosen = eligible.filter((sale) => selected.includes(sale.id));
  const total = sumBy(chosen, (sale) => saleBalance(state, sale));
  const dates = chosen.map((sale) => sale.at).sort();
  const closings = useMemo(
    () =>
      [...state.closings]
        .filter(
          (closing) => statusFilter === "all" || closingStatus(state, closing) === statusFilter,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state, statusFilter],
  );
  const pagination = usePagination(closings, 8);
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  return (
    <>
      <PageHeader
        title="Fechamentos"
        subtitle="Consolidação de vendas em aberto por cliente — as vendas continuam existindo individualmente"
      />
      <div className="closing-layout">
        <Card
          title="Gerar novo fechamento"
          subtitle="Selecione o cliente e as vendas com saldo pendente"
        >
          <div className="card-pad form-stack">
            <Field label="Cliente">
              <select
                value={customerId}
                onChange={(event) => {
                  setCustomerId(event.target.value);
                  setSelected([]);
                }}
              >
                <option value="">Selecione</option>
                {state.customers
                  .filter((item) => !item.generic)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {eligibleCustomers.some((candidate) => candidate.id === item.id)
                        ? " • com vendas em aberto"
                        : ""}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="open-sales">
              <div className="select-all">
                <strong>Vendas elegíveis</strong>
                {eligible.length > 0 && (
                  <button
                    type="button"
                    className="table-link"
                    onClick={() =>
                      setSelected(
                        selected.length === eligible.length ? [] : eligible.map((sale) => sale.id),
                      )
                    }
                  >
                    {selected.length === eligible.length ? "Desmarcar todas" : "Selecionar todas"}
                  </button>
                )}
              </div>
              {eligible.length === 0 ? (
                <p className="muted-text pad">
                  {customer
                    ? "Nenhuma venda com saldo pendente fora de fechamentos."
                    : "Selecione um cliente."}
                </p>
              ) : (
                eligible.map((sale) => (
                  <label key={sale.id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(sale.id)}
                      onChange={() => toggle(sale.id)}
                    />
                    <div>
                      <strong>{sale.number}</strong>
                      <small>
                        {formatDate(sale.at)} · {saleCommercialLabel(state, sale)} · original{" "}
                        {money(saleGross(sale))}
                        {saleReturnedValue(state, sale) > 0
                          ? ` · devolvido ${money(saleReturnedValue(state, sale))}`
                          : ""}
                      </small>
                    </div>
                    <b>{money(saleBalance(state, sale))}</b>
                  </label>
                ))
              )}
            </div>
          </div>
        </Card>
        <aside>
          <Card title="Resumo do fechamento">
            <div className="summary-lines">
              <div>
                <span>Cliente</span>
                <strong>{customer?.name ?? "—"}</strong>
              </div>
              <div>
                <span>Período</span>
                <strong>
                  {dates.length
                    ? `${formatDate(dates[0])} a ${formatDate(dates[dates.length - 1])}`
                    : "—"}
                </strong>
              </div>
              <div>
                <span>Vendas selecionadas</span>
                <strong>{chosen.length}</strong>
              </div>
              <hr />
              <div className="summary-total">
                <span>Valor total</span>
                <strong>{money(total)}</strong>
              </div>
            </div>
            <div className="card-pad form-stack">
              <Field label="Vencimento" required>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </Field>
              <Field label="Observações">
                <input value={notes} onChange={(event) => setNotes(event.target.value)} />
              </Field>
              <ErrorBanner error={error} />
              <Button
                icon={ClipboardCheck}
                full
                loading={busy}
                disabledReason={
                  deny("closings.manage") ??
                  (chosen.length === 0
                    ? "Selecione ao menos uma venda"
                    : !dueDate
                      ? "Informe o vencimento"
                      : undefined)
                }
                onClick={() =>
                  execute(
                    {
                      type: "closing.create",
                      customerId,
                      saleIds: chosen.map((sale) => sale.id),
                      dueDate,
                      notes,
                    },
                    {
                      onSuccess: (id) => {
                        setSelected([]);
                        setNotes("");
                        if (id) navigate({ page: "closings", id });
                      },
                    },
                  )
                }
              >
                Gerar fechamento
              </Button>
            </div>
          </Card>
        </aside>
        <Card
          className="closing-history table-card"
          title="Fechamentos registrados"
          subtitle={`${closings.length} fechamento(s)`}
          action={
            <Select
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "Todos os status" },
                "Em aberto",
                "Parcialmente pago",
                "Pago",
                "Reembolso pendente",
              ]}
            />
          }
        >
          {closings.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Nenhum fechamento"
              text="Os fechamentos gerados aparecerão aqui."
            />
          ) : (
            <DataTable
              headers={[
                "Fechamento",
                "Cliente",
                "Período",
                "Vendas",
                "Total",
                "Pago",
                "Saldo",
                "Vencimento",
                "Status",
              ]}
            >
              {pagination.pageItems.map((closing) => (
                <tr key={closing.id}>
                  <td>
                    <RecordLink route={{ page: "closings", id: closing.id }}>
                      {closing.number}
                    </RecordLink>
                  </td>
                  <td>
                    <CustomerLink id={closing.customerId} />
                  </td>
                  <td>
                    {formatDate(closing.periodStart)} a {formatDate(closing.periodEnd)}
                  </td>
                  <td>{closing.saleIds.length}</td>
                  <td>{money(closingTotal(state, closing))}</td>
                  <td>{money(closingPaid(state, closing))}</td>
                  <td>
                    <strong>{money(closingBalance(state, closing))}</strong>
                  </td>
                  <td>{formatDate(`${closing.dueDate}T12:00:00`)}</td>
                  <td>
                    <Status value={closingStatus(state, closing)} />
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
          <Pagination {...pagination} />
        </Card>
      </div>
    </>
  );
}

function ClosingDetail({ id }: { id: string }) {
  const { state } = useStore();
  const { open } = useNavigation();
  const deny = useDeny();
  const closing = byId(state.closings, id);
  if (!closing) {
    return (
      <>
        <PageHeader title="Fechamento não encontrado" backTo={{ page: "closings" }} />
        <Card>
          <EmptyState
            icon={Users}
            title="Registro inexistente"
            text="Este fechamento não existe nos dados atuais."
          />
        </Card>
      </>
    );
  }
  const balance = closingBalance(state, closing);
  const payments = closingPayments(state, id);
  return (
    <>
      <PageHeader
        title={`Fechamento ${closing.number}`}
        subtitle={`${customerName(state, closing.customerId)} · ${formatDate(closing.periodStart)} a ${formatDate(closing.periodEnd)}`}
        record={closing.number}
        backTo={{ page: "closings" }}
        actions={
          <>
            {balance > 0.004 && (
              <Button
                variant="success"
                icon={CreditCard}
                onClick={() =>
                  open({ type: "payment", target: { closingId: id }, mode: "receipt" })
                }
                disabledReason={deny("finance.manage")}
              >
                Registrar pagamento
              </Button>
            )}
            {balance < -0.004 && (
              <Button
                icon={RotateCcw}
                onClick={() => open({ type: "payment", target: { closingId: id }, mode: "refund" })}
                disabledReason={deny("finance.manage")}
              >
                Registrar reembolso
              </Button>
            )}
          </>
        }
      />
      <div className="page-stack">
        <div className="info-grid no-pad">
          <InfoSection
            title="Fechamento"
            values={[
              ["Cliente", <CustomerLink key="c" id={closing.customerId} />],
              ["Período", `${formatDate(closing.periodStart)} a ${formatDate(closing.periodEnd)}`],
              ["Vencimento", formatDate(`${closing.dueDate}T12:00:00`)],
              [
                "Gerado em",
                `${formatDateTime(closing.createdAt)} por ${userName(state, closing.createdBy)}`,
              ],
              ["Observações", closing.notes || "—"],
            ]}
          />
          <InfoSection
            title="Situação financeira"
            values={[
              ["Valor total atualizado", money(closingTotal(state, closing))],
              ["Pagamentos válidos", money(closingPaid(state, closing))],
              [balance < 0 ? "Reembolso pendente" : "Saldo pendente", money(Math.abs(balance))],
              ["Status", <Status key="s" value={closingStatus(state, closing)} />],
            ]}
          />
        </div>
        <Notice title="Total atualizado automaticamente">
          O total considera devoluções e cancelamentos posteriores das vendas incluídas. Cada venda
          continua consultável individualmente.
        </Notice>
        <Card title="Vendas incluídas" subtitle={`${closing.saleIds.length} venda(s)`}>
          <DataTable
            headers={[
              "Venda",
              "Data",
              "Valor original",
              "Devolvido",
              "Valor líquido",
              "A receber no fechamento",
              "Situação",
            ]}
          >
            {closing.saleIds.map((saleId) => {
              const sale = byId(state.sales, saleId);
              if (!sale) return null;
              return (
                <tr key={saleId}>
                  <td>
                    <SaleLink id={saleId} />
                  </td>
                  <td>{formatDateTime(sale.at)}</td>
                  <td>{money(saleGross(sale))}</td>
                  <td>{money(saleReturnedValue(state, sale))}</td>
                  <td>{money(saleNet(state, sale))}</td>
                  <td>
                    <strong>{money(saleBalance(state, sale))}</strong>
                  </td>
                  <td>
                    <Status value={saleCommercialLabel(state, sale)} />
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </Card>
        <Card title="Pagamentos" subtitle={`${payments.length} lançamento(s)`}>
          {payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Nenhum pagamento registrado"
              text="Registre pagamentos totais ou parciais."
            />
          ) : (
            <DataTable
              headers={[
                "Lançamento",
                "Tipo",
                "Data",
                "Forma",
                "Valor",
                "Responsável",
                "Observações",
              ]}
            >
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.number}</td>
                  <td>
                    <Status
                      value={payment.kind === "receipt" ? "Recebimento" : "Reembolso"}
                      tone={payment.kind === "receipt" ? "success" : "warning"}
                    />
                  </td>
                  <td>{formatDateTime(payment.at)}</td>
                  <td>{payment.method}</td>
                  <td>
                    <strong>{money(payment.amount)}</strong>
                  </td>
                  <td>{userName(state, payment.userId)}</td>
                  <td className="wrap-cell">{payment.notes || "—"}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
      </div>
    </>
  );
}
