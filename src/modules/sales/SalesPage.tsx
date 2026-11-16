import { useMemo, useState } from "react";
import { Plus, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button, Card, Field, SearchInput, Tabs } from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { useDeny } from "../../components/shared/permissions";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId } from "../../store/selectors";
import {
  saleBalance,
  saleCommercialLabel,
  saleFinancialStatus,
  saleNet,
  saleReturns,
} from "../../domain/rules/finance";
import type { Sale } from "../../domain/types";
import { matchesText, sumBy } from "../../utils/calculations";
import { money } from "../../utils/currency";
import { endOfDay, formatTime, startOfDay } from "../../utils/dates";
import { SalesTable, paymentLabel } from "./SalesTable";
import { SaleDetail } from "./SaleDetail";

const TABS = ["Consulta de vendas", "Em aberto", "Devoluções", "Canceladas"] as const;
type Tab = (typeof TABS)[number];

interface Filters {
  number: string;
  product: string;
  customerId: string;
  sellerId: string;
  from: string;
  to: string;
  timeFrom: string;
  timeTo: string;
  min: string;
  max: string;
  payment: string;
  status: string;
  financial: string;
  notes: string;
}

const EMPTY: Filters = {
  number: "",
  product: "",
  customerId: "",
  sellerId: "",
  from: "",
  to: "",
  timeFrom: "",
  timeTo: "",
  min: "",
  max: "",
  payment: "",
  status: "",
  financial: "",
  notes: "",
};

export function SalesPage() {
  const { route } = useNavigation();
  return route.id ? <SaleDetail id={route.id} /> : <SalesList />;
}

function SalesList() {
  const { state } = useStore();
  const { route, replace, open } = useNavigation();
  const deny = useDeny();
  const tab = (TABS.includes(route.tab as Tab) ? route.tab : TABS[0]) as Tab;
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [advanced, setAdvanced] = useState(false);
  const set = (key: keyof Filters) => (event: { target: { value: string } }) =>
    setFilters({ ...filters, [key]: event.target.value });
  const activeFilters = Object.values(filters).filter(Boolean).length;

  const tabFilter = (sale: Sale) => {
    if (tab === "Em aberto")
      return (
        sale.status === "valid" &&
        (sale.closingId
          ? saleFinancialStatus(state, sale) === "Em fechamento"
          : saleBalance(state, sale) > 0.005)
      );
    if (tab === "Devoluções") return saleReturns(state, sale.id).length > 0;
    if (tab === "Canceladas") return sale.status === "cancelled";
    return true;
  };

  const matches = (sale: Sale) => {
    const productText = (s: Sale) =>
      s.items.flatMap((item) => [
        item.code,
        item.manufacturerCode,
        item.name,
        byId(state.products, item.productId)?.ean,
        byId(state.products, item.productId)?.oemCode,
      ]);
    if (
      query &&
      !matchesText(
        query,
        sale.number,
        sale.customerName,
        sale.sellerName,
        sale.notes,
        ...productText(sale),
      )
    )
      return false;
    if (filters.number && !matchesText(filters.number, sale.number)) return false;
    if (filters.product && !matchesText(filters.product, ...productText(sale))) return false;
    if (filters.customerId && sale.customerId !== filters.customerId) return false;
    if (filters.sellerId && sale.sellerId !== filters.sellerId) return false;
    if (filters.from && new Date(sale.at) < startOfDay(`${filters.from}T00:00:00`)) return false;
    if (filters.to && new Date(sale.at) > endOfDay(`${filters.to}T00:00:00`)) return false;
    const time = formatTime(sale.at);
    if (filters.timeFrom && time < filters.timeFrom) return false;
    if (filters.timeTo && time > filters.timeTo) return false;
    const net = saleNet(state, sale);
    if (filters.min && net < Number(filters.min)) return false;
    if (filters.max && net > Number(filters.max)) return false;
    if (filters.payment && paymentLabel(sale) !== filters.payment) return false;
    if (filters.status && saleCommercialLabel(state, sale) !== filters.status) return false;
    if (filters.financial && saleFinancialStatus(state, sale) !== filters.financial) return false;
    if (filters.notes && !matchesText(filters.notes, sale.notes, sale.cancelReason)) return false;
    return true;
  };

  const results = useMemo(
    () =>
      [...state.sales]
        .filter(tabFilter)
        .filter(matches)
        .sort((a, b) => b.at.localeCompare(a.at)),
    [state, tab, query, filters],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => {
    const result: Partial<Record<Tab, number>> = {};
    result["Em aberto"] = state.sales.filter(
      (sale) =>
        sale.status === "valid" &&
        (sale.closingId
          ? saleFinancialStatus(state, sale) === "Em fechamento"
          : saleBalance(state, sale) > 0.005),
    ).length;
    result["Devoluções"] = new Set(state.returns.map((item) => item.saleId)).size;
    result["Canceladas"] = state.sales.filter((sale) => sale.status === "cancelled").length;
    return result;
  }, [state]);

  return (
    <>
      <PageHeader
        title="Vendas"
        subtitle="Frente de caixa e consulta avançada de vendas"
        actions={
          <Button
            icon={Plus}
            onClick={() => open({ type: "pos" })}
            disabledReason={deny("sales.create")}
          >
            Nova venda
          </Button>
        }
      />
      <Card className="table-card">
        <Tabs
          tabs={TABS}
          value={tab}
          onChange={(next) => replace({ ...route, tab: next })}
          counts={counts}
        />
        <div className="filter-row">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Número, produto, código, EAN, cliente, vendedor ou observação..."
          />
          <Button
            variant="secondary"
            icon={SlidersHorizontal}
            onClick={() => setAdvanced(!advanced)}
          >
            Filtros avançados{activeFilters ? ` (${activeFilters})` : ""}
          </Button>
          {(activeFilters > 0 || query) && (
            <Button
              variant="secondary"
              icon={RotateCcw}
              onClick={() => {
                setFilters(EMPTY);
                setQuery("");
              }}
            >
              Limpar
            </Button>
          )}
        </div>
        {advanced && (
          <div className="advanced-panel">
            <Field label="Número da venda">
              <input value={filters.number} onChange={set("number")} placeholder="VD-2840" />
            </Field>
            <Field label="Produto (código, fabricante, EAN, descrição)">
              <input value={filters.product} onChange={set("product")} />
            </Field>
            <Field label="Cliente">
              <select value={filters.customerId} onChange={set("customerId")}>
                <option value="">Todos</option>
                {state.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Vendedor">
              <select value={filters.sellerId} onChange={set("sellerId")}>
                <option value="">Todos</option>
                {state.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data inicial">
              <input type="date" value={filters.from} onChange={set("from")} />
            </Field>
            <Field label="Data final">
              <input type="date" value={filters.to} onChange={set("to")} />
            </Field>
            <Field label="Horário de">
              <input type="time" value={filters.timeFrom} onChange={set("timeFrom")} />
            </Field>
            <Field label="Horário até">
              <input type="time" value={filters.timeTo} onChange={set("timeTo")} />
            </Field>
            <Field label="Valor mínimo (R$)">
              <input type="number" min="0" step="0.01" value={filters.min} onChange={set("min")} />
            </Field>
            <Field label="Valor máximo (R$)">
              <input type="number" min="0" step="0.01" value={filters.max} onChange={set("max")} />
            </Field>
            <Field label="Forma de pagamento">
              <select value={filters.payment} onChange={set("payment")}>
                <option value="">Todas</option>
                {[
                  "PIX",
                  "Dinheiro",
                  "Cartão de débito",
                  "Cartão de crédito",
                  "Transferência",
                  "Boleto",
                  "A prazo",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Situação comercial">
              <select value={filters.status} onChange={set("status")}>
                <option value="">Todas</option>
                {["Concluída", "Devolução parcial", "Devolvida", "Cancelada"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Situação financeira">
              <select value={filters.financial} onChange={set("financial")}>
                <option value="">Todas</option>
                {[
                  "Pago",
                  "Em aberto",
                  "Parcialmente pago",
                  "Em fechamento",
                  "Reembolso pendente",
                  "Sem saldo",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Observações">
              <input value={filters.notes} onChange={set("notes")} />
            </Field>
          </div>
        )}
        <div className="result-count">
          <strong>{results.length} venda(s) encontrada(s)</strong>
          <span>Valor líquido: {money(sumBy(results, (sale) => saleNet(state, sale)))}</span>
        </div>
        <SalesTable key={`${tab}-${query}-${JSON.stringify(filters)}`} sales={results} />
      </Card>
    </>
  );
}
