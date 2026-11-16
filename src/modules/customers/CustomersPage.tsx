import { useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  Eye,
  Pencil,
  Plus,
  Power,
  ShoppingCart,
  Users,
} from "lucide-react";
import {
  ActionMenu,
  Button,
  Card,
  DataTable,
  EmptyState,
  InfoSection,
  MiniStat,
  Pagination,
  SearchInput,
  Select,
  Status,
  Tabs,
  usePagination,
} from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { RecordLink, SaleLink } from "../../components/shared/Links";
import { useCommand } from "../../components/shared/useCommand";
import { useDeny } from "../../components/shared/permissions";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId, customerSales, userName } from "../../store/selectors";
import {
  closingBalance,
  closingStatus,
  closingTotal,
  customerOpenBalance,
  saleBalance,
  saleNet,
} from "../../domain/rules/finance";
import { matchesText, sumBy } from "../../utils/calculations";
import { money } from "../../utils/currency";
import { formatDate, formatDateTime } from "../../utils/dates";
import { SalesTable } from "../sales/SalesTable";
import { ReminderList } from "../reminders/ReminderList";

export function CustomersPage() {
  const { route } = useNavigation();
  return route.id ? <CustomerDetail id={route.id} /> : <CustomerList />;
}

function CustomerList() {
  const { state } = useStore();
  const { navigate, open } = useNavigation();
  const { execute } = useCommand();
  const deny = useDeny();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("active");
  const customers = useMemo(
    () =>
      state.customers
        .filter((customer) => !customer.generic)
        .filter((customer) =>
          matchesText(
            query,
            customer.name,
            customer.document,
            customer.phone,
            customer.email,
            customer.address,
          ),
        )
        .filter((customer) => type === "all" || customer.type === type)
        .filter(
          (customer) =>
            status === "all" || (status === "active" ? customer.active : !customer.active),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state.customers, query, type, status],
  );
  const pagination = usePagination(customers, 10);
  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro, histórico e situação comercial"
        actions={
          <Button
            icon={Plus}
            onClick={() => open({ type: "customer-form" })}
            disabledReason={deny("customers.manage")}
          >
            Novo cliente
          </Button>
        }
      />
      <Card
        className="table-card"
        title="Clientes cadastrados"
        subtitle={`${customers.length} registro(s) · AO CONSUMIDOR é uma identificação genérica`}
      >
        <div className="filter-row">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Nome, CPF/CNPJ, telefone, e-mail ou endereço..."
          />
          <Select
            label="Tipo"
            value={type}
            onChange={setType}
            options={[
              { value: "all", label: "Todos os tipos" },
              "Pessoa física",
              "Oficina",
              "Frota",
              "Revenda",
            ]}
          />
          <Select
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "Ativos" },
              { value: "inactive", label: "Inativos" },
              { value: "all", label: "Todos" },
            ]}
          />
        </div>
        {customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum cliente encontrado"
            text="Ajuste a pesquisa ou cadastre um novo cliente."
          />
        ) : (
          <DataTable
            headers={[
              "Cliente",
              "CPF/CNPJ",
              "Telefone",
              "Tipo",
              "Condição",
              "Limite de crédito",
              "Em aberto",
              "Status",
              "",
            ]}
          >
            {pagination.pageItems.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <button
                    type="button"
                    className="table-link"
                    onClick={() => navigate({ page: "clients", id: customer.id })}
                  >
                    {customer.name}
                  </button>
                  <small>{customer.email || "—"}</small>
                </td>
                <td>{customer.document}</td>
                <td>{customer.phone || "—"}</td>
                <td>{customer.type}</td>
                <td>{customer.paymentTerms}</td>
                <td>{customer.creditLimit ? money(customer.creditLimit) : "—"}</td>
                <td>{money(customerOpenBalance(state, customer.id))}</td>
                <td>
                  <Status value={customer.active ? "Ativo" : "Inativo"} />
                </td>
                <td>
                  <ActionMenu
                    items={[
                      {
                        label: "Ver detalhes",
                        icon: Eye,
                        onClick: () => navigate({ page: "clients", id: customer.id }),
                      },
                      {
                        label: "Editar",
                        icon: Pencil,
                        onClick: () => open({ type: "customer-form", customerId: customer.id }),
                        disabledReason: deny("customers.manage"),
                      },
                      {
                        label: "Nova venda",
                        icon: ShoppingCart,
                        onClick: () => open({ type: "pos", customerId: customer.id }),
                        disabledReason:
                          deny("sales.create") ?? (customer.active ? undefined : "Cliente inativo"),
                      },
                      {
                        label: "Criar lembrete",
                        icon: Bell,
                        onClick: () => open({ type: "reminder-form", customerId: customer.id }),
                        disabledReason: deny("reminders.manage"),
                      },
                      {
                        label: customer.active ? "Inativar" : "Reativar",
                        icon: Power,
                        danger: customer.active,
                        onClick: () => execute({ type: "customer.toggleActive", id: customer.id }),
                        disabledReason: deny("customers.manage"),
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        )}
        <Pagination {...pagination} />
      </Card>
    </>
  );
}

const TABS = [
  "Dados gerais",
  "Histórico de compras",
  "Vendas em aberto",
  "Fechamentos",
  "Pagamentos",
  "Lembretes",
] as const;
type Tab = (typeof TABS)[number];

function CustomerDetail({ id }: { id: string }) {
  const { state } = useStore();
  const { route, replace, open, navigate } = useNavigation();
  const { execute } = useCommand();
  const deny = useDeny();
  const customer = byId(state.customers, id);
  if (!customer) {
    return (
      <>
        <PageHeader title="Cliente não encontrado" backTo={{ page: "clients" }} />
        <Card>
          <EmptyState
            icon={Users}
            title="Registro inexistente"
            text="Este cliente não existe nos dados atuais."
          />
        </Card>
      </>
    );
  }
  const tab = (TABS.includes(route.tab as Tab) ? route.tab : TABS[0]) as Tab;
  const sales = customerSales(state, id);
  const open_ = sales.filter(
    (sale) =>
      sale.status === "valid" &&
      (sale.closingId
        ? closingBalance(state, byId(state.closings, sale.closingId)!) > 0.005
        : saleBalance(state, sale) > 0.005),
  );
  const closings = state.closings
    .filter((closing) => closing.customerId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const payments = state.payments
    .filter((payment) => payment.customerId === id)
    .sort((a, b) => b.at.localeCompare(a.at));
  const reminders = state.reminders.filter((reminder) => reminder.customerId === id);
  const revenue = sumBy(sales, (sale) => saleNet(state, sale));

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle={`${customer.type} · ${customer.document} · cliente desde ${formatDate(customer.createdAt)}`}
        record={customer.name}
        backTo={{ page: "clients" }}
        actions={
          customer.generic ? undefined : (
            <>
              <Button
                variant="secondary"
                icon={Power}
                onClick={() => execute({ type: "customer.toggleActive", id })}
                disabledReason={deny("customers.manage")}
              >
                {customer.active ? "Inativar" : "Reativar"}
              </Button>
              <Button
                variant="secondary"
                icon={Pencil}
                onClick={() => open({ type: "customer-form", customerId: id })}
                disabledReason={deny("customers.manage")}
              >
                Editar
              </Button>
              <Button
                icon={ShoppingCart}
                onClick={() => open({ type: "pos", customerId: id })}
                disabledReason={
                  deny("sales.create") ?? (customer.active ? undefined : "Cliente inativo")
                }
              >
                Nova venda
              </Button>
            </>
          )
        }
      />
      <div className="page-stack">
        <section className="mini-stats">
          <MiniStat
            label="Faturamento líquido (histórico)"
            value={money(revenue)}
            icon={ShoppingCart}
          />
          <MiniStat
            label="Saldo em aberto"
            value={money(customerOpenBalance(state, id))}
            icon={CreditCard}
            tone="warning"
            onClick={() => replace({ ...route, tab: "Vendas em aberto" })}
          />
          <MiniStat
            label="Fechamentos"
            value={String(closings.length)}
            icon={ClipboardCheck}
            onClick={() => replace({ ...route, tab: "Fechamentos" })}
          />
          <MiniStat
            label="Lembretes pendentes"
            value={String(reminders.filter((reminder) => reminder.status === "pending").length)}
            icon={CalendarClock}
            onClick={() => replace({ ...route, tab: "Lembretes" })}
          />
        </section>
        <Card className="table-card">
          <Tabs
            tabs={TABS}
            value={tab}
            onChange={(next) => replace({ ...route, tab: next })}
            counts={{
              "Histórico de compras": sales.length,
              "Vendas em aberto": open_.length,
              Fechamentos: closings.length,
              Pagamentos: payments.length,
              Lembretes: reminders.length,
            }}
          />
          {tab === "Dados gerais" && (
            <div className="info-grid">
              <InfoSection
                title="Cadastro"
                values={[
                  ["Nome / razão social", customer.name],
                  ["CPF/CNPJ", customer.document],
                  ["Telefone", customer.phone || "—"],
                  ["E-mail", customer.email || "—"],
                  ["Endereço", customer.address || "—"],
                ]}
              />
              <InfoSection
                title="Condição comercial"
                values={[
                  ["Tipo", customer.type],
                  ["Condição de pagamento", customer.paymentTerms],
                  [
                    "Limite de crédito",
                    customer.creditLimit ? money(customer.creditLimit) : "Não definido",
                  ],
                  ["Saldo em aberto", money(customerOpenBalance(state, id))],
                  ["Status", <Status key="s" value={customer.active ? "Ativo" : "Inativo"} />],
                ]}
              />
              {customer.notes && (
                <InfoSection title="Observações do cadastro" values={[["Notas", customer.notes]]} />
              )}
            </div>
          )}
          {tab === "Histórico de compras" && (
            <SalesTable
              sales={sales}
              showCustomer={false}
              empty="Este cliente ainda não possui vendas."
            />
          )}
          {tab === "Vendas em aberto" && (
            <div className="tab-content">
              {open_.length > 0 && (
                <div className="tab-toolbar">
                  <Button
                    small
                    icon={ClipboardCheck}
                    onClick={() => navigate({ page: "closings", params: { customerId: id } })}
                    disabledReason={deny("closings.manage")}
                  >
                    Gerar fechamento
                  </Button>
                </div>
              )}
              <SalesTable
                sales={open_}
                showCustomer={false}
                empty="Nenhuma venda com saldo pendente."
              />
            </div>
          )}
          {tab === "Fechamentos" &&
            (closings.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="Nenhum fechamento"
                text="Fechamentos consolidados deste cliente aparecerão aqui."
              />
            ) : (
              <DataTable
                headers={[
                  "Fechamento",
                  "Período",
                  "Vendas",
                  "Total",
                  "Saldo",
                  "Vencimento",
                  "Status",
                ]}
              >
                {closings.map((closing) => (
                  <tr key={closing.id}>
                    <td>
                      <RecordLink route={{ page: "closings", id: closing.id }}>
                        {closing.number}
                      </RecordLink>
                    </td>
                    <td>
                      {formatDate(closing.periodStart)} a {formatDate(closing.periodEnd)}
                    </td>
                    <td>{closing.saleIds.length}</td>
                    <td>{money(closingTotal(state, closing))}</td>
                    <td>{money(closingBalance(state, closing))}</td>
                    <td>{formatDate(`${closing.dueDate}T12:00:00`)}</td>
                    <td>
                      <Status value={closingStatus(state, closing)} />
                    </td>
                  </tr>
                ))}
              </DataTable>
            ))}
          {tab === "Pagamentos" &&
            (payments.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="Nenhum pagamento"
                text="Recebimentos e reembolsos deste cliente aparecerão aqui."
              />
            ) : (
              <DataTable
                headers={["Lançamento", "Tipo", "Data", "Origem", "Forma", "Valor", "Usuário"]}
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
                    <td>
                      {payment.saleId ? (
                        <SaleLink id={payment.saleId} />
                      ) : payment.closingId ? (
                        <RecordLink route={{ page: "closings", id: payment.closingId }}>
                          {byId(state.closings, payment.closingId)?.number}
                        </RecordLink>
                      ) : (
                        "—"
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
            ))}
          {tab === "Lembretes" && (
            <div className="tab-content">
              <div className="tab-toolbar">
                <Button
                  small
                  icon={Bell}
                  onClick={() => open({ type: "reminder-form", customerId: id })}
                  disabledReason={deny("reminders.manage")}
                >
                  Criar lembrete
                </Button>
              </div>
              <ReminderList reminders={reminders} />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
