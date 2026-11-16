import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  CreditCard,
  Download,
  FileBarChart,
  Package,
  Printer,
  RotateCcw,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button, Card, DataTable, EmptyState, Select } from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import {
  byId,
  customerName,
  dailyRevenue,
  lowStockProducts,
  productRanking,
  sellerRanking,
  userName,
} from "../../store/selectors";
import {
  activeReceivables,
  saleGross,
  saleNet,
  saleValueAfterReturns,
} from "../../domain/rules/finance";
import {
  inRange,
  periodLabels,
  periodRange,
  formatDate,
  formatDateTime,
  type PeriodKey,
} from "../../utils/dates";
import { money } from "../../utils/currency";
import { sumBy } from "../../utils/calculations";
import { useState } from "react";

type ReportId =
  | "period"
  | "sellers"
  | "products"
  | "lowstock"
  | "returns"
  | "cancellations"
  | "open";

const REPORTS: { id: ReportId; title: string; text: string; icon: LucideIcon }[] = [
  {
    id: "period",
    title: "Vendas por período",
    text: "Faturamento líquido, quantidade e ticket por dia.",
    icon: TrendingUp,
  },
  {
    id: "sellers",
    title: "Vendas por vendedor",
    text: "Desempenho comercial da equipe.",
    icon: Users,
  },
  {
    id: "products",
    title: "Produtos mais vendidos",
    text: "Ranking por quantidade líquida e faturamento.",
    icon: Package,
  },
  {
    id: "lowstock",
    title: "Estoque baixo",
    text: "Itens ativos no mínimo ou abaixo dele.",
    icon: AlertCircle,
  },
  {
    id: "returns",
    title: "Histórico de devoluções",
    text: "Produtos e valores devolvidos no período.",
    icon: RotateCcw,
  },
  {
    id: "cancellations",
    title: "Cancelamentos",
    text: "Motivos e valores das vendas canceladas.",
    icon: X,
  },
  {
    id: "open",
    title: "Valores em aberto",
    text: "Saldos pendentes por título e vencimento.",
    icon: CreditCard,
  },
];

interface Table {
  headers: string[];
  rows: (string | number)[][];
  total?: string;
}

function buildReport(
  state: ReturnType<typeof useStore>["state"],
  id: ReportId,
  period: PeriodKey,
): Table {
  const range = periodRange(period);
  const days =
    period === "today"
      ? 1
      : period === "7d"
        ? 7
        : period === "30d"
          ? 30
          : period === "month"
            ? new Date().getDate()
            : 90;
  switch (id) {
    case "period": {
      const series = dailyRevenue(state, days).filter((point) => point.count > 0);
      return {
        headers: ["Data", "Vendas válidas", "Faturamento líquido", "Ticket médio"],
        rows: series.map((point) => [
          formatDate(`${point.date}T12:00:00`),
          point.count,
          money(point.revenue),
          money(point.count ? point.revenue / point.count : 0),
        ]),
        total: `Total: ${money(sumBy(series, (point) => point.revenue))} em ${series.reduce((sum, point) => sum + point.count, 0)} venda(s)`,
      };
    }
    case "sellers": {
      const rows = sellerRanking(state, range);
      return {
        headers: ["Vendedor", "Vendas válidas", "Faturamento líquido", "Ticket médio"],
        rows: rows.map((row) => [
          row.name,
          row.count,
          money(row.revenue),
          money(row.revenue / row.count),
        ]),
        total: `Total: ${money(sumBy(rows, (row) => row.revenue))}`,
      };
    }
    case "products": {
      const rows = productRanking(state, range);
      return {
        headers: ["Código", "Produto", "Quantidade líquida", "Faturamento"],
        rows: rows.map((row) => [row.code, row.name, row.quantity, money(row.revenue)]),
        total: `Total: ${money(sumBy(rows, (row) => row.revenue))}`,
      };
    }
    case "lowstock":
      return {
        headers: ["Código", "Produto", "Estoque", "Mínimo", "Máximo", "Sugestão de compra"],
        rows: lowStockProducts(state).map((product) => [
          product.code,
          product.name,
          product.stock,
          product.min,
          product.max,
          Math.max(0, product.max - product.stock),
        ]),
      };
    case "returns": {
      const rows = state.returns.filter((item) => inRange(item.at, range));
      return {
        headers: ["Devolução", "Venda", "Data", "Itens", "Valor", "Motivo", "Usuário"],
        rows: rows.map((item) => [
          item.number,
          byId(state.sales, item.saleId)?.number ?? "—",
          formatDateTime(item.at),
          item.items.reduce((sum, line) => sum + line.quantity, 0),
          money(sumBy(item.items, (line) => line.quantity * line.unitPrice)),
          item.reason,
          userName(state, item.userId),
        ]),
        total: `Total devolvido: ${money(sumBy(rows, (item) => sumBy(item.items, (line) => line.quantity * line.unitPrice)))}`,
      };
    }
    case "cancellations": {
      const rows = state.sales.filter(
        (sale) =>
          sale.status === "cancelled" && sale.cancelledAt && inRange(sale.cancelledAt, range),
      );
      return {
        headers: [
          "Venda",
          "Cliente",
          "Data da venda",
          "Cancelada em",
          "Valor revertido",
          "Motivo",
          "Usuário",
        ],
        rows: rows.map((sale) => [
          sale.number,
          sale.customerName,
          formatDateTime(sale.at),
          formatDateTime(sale.cancelledAt),
          money(saleValueAfterReturns(state, sale)),
          sale.cancelReason ?? "",
          userName(state, sale.cancelledBy),
        ]),
        total: `Total revertido: ${money(sumBy(rows, (sale) => saleValueAfterReturns(state, sale)))}`,
      };
    }
    case "open": {
      const rows = activeReceivables(state).filter((view) => view.balance > 0.005);
      return {
        headers: ["Título", "Cliente", "Origem", "Vencimento", "Saldo", "Status"],
        rows: rows.map((view) => [
          view.receivable.number,
          customerName(state, view.receivable.customerId),
          view.receivable.origin === "sale"
            ? (byId(state.sales, view.receivable.saleId)?.number ?? "")
            : (byId(state.closings, view.receivable.closingId)?.number ?? ""),
          formatDate(`${view.receivable.dueDate}T12:00:00`),
          money(view.balance),
          view.status,
        ]),
        total: `Total em aberto: ${money(sumBy(rows, (view) => view.balance))}`,
      };
    }
  }
}

function downloadCsv(name: string, table: Table) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const content = [table.headers, ...table.rows].map((row) => row.map(escape).join(";")).join("\n");
  const url = URL.createObjectURL(
    new Blob([`\ufeff${content}`], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { state } = useStore();
  const { route, replace } = useNavigation();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const selected = REPORTS.find((report) => report.id === route.params?.report);
  const usesPeriod = selected && !["lowstock", "open"].includes(selected.id);
  const table = selected ? buildReport(state, selected.id, period) : null;
  const validRevenue = sumBy(
    state.sales.filter((sale) => sale.status === "valid" && inRange(sale.at, periodRange(period))),
    (sale) => saleNet(state, sale),
  );

  let content: ReactNode;
  if (!selected || !table) {
    content = (
      <>
        <div className="section-callout">
          <div>
            <span>RELATÓRIOS GERENCIAIS</span>
            <h2>Indicadores calculados a partir dos registros</h2>
            <p>
              Mesma base de dados do dashboard e do financeiro. Exportação em CSV e impressão
              disponíveis.
            </p>
          </div>
          <FileBarChart size={62} />
        </div>
        <div className="report-grid">
          {REPORTS.map(({ id, title, text, icon: Icon }) => (
            <button
              type="button"
              key={id}
              onClick={() => replace({ page: "reports", params: { report: id } })}
            >
              <span>
                <Icon size={22} />
              </span>
              <div>
                <strong>{title}</strong>
                <small>{text}</small>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </>
    );
  } else {
    content = (
      <Card
        className="table-card printable"
        title={selected.title}
        subtitle={`${usesPeriod ? periodLabels[period] : "Posição atual"} · gerado em ${formatDateTime(new Date())}`}
        action={
          <div className="row-buttons no-print">
            {usesPeriod && (
              <Select
                label="Período"
                value={period}
                onChange={setPeriod}
                options={(Object.keys(periodLabels) as PeriodKey[]).map((value) => ({
                  value,
                  label: periodLabels[value],
                }))}
              />
            )}
            <Button
              small
              variant="secondary"
              icon={Download}
              onClick={() => downloadCsv(selected.id, table)}
              disabledReason={table.rows.length ? undefined : "Sem dados"}
            >
              CSV
            </Button>
            <Button small variant="secondary" icon={Printer} onClick={() => window.print()}>
              Imprimir
            </Button>
          </div>
        }
      >
        {table.rows.length === 0 ? (
          <EmptyState
            icon={FileBarChart}
            title="Sem dados para o período"
            text="Altere o período ou registre novas operações."
          />
        ) : (
          <DataTable headers={table.headers}>
            {table.rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={typeof cell === "string" && cell.length > 40 ? "wrap-cell" : ""}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </DataTable>
        )}
        {table.total && (
          <div className="result-count">
            <strong>{table.total}</strong>
            {selected.id === "period" && (
              <span>Confere com o faturamento válido do período: {money(validRevenue)}</span>
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title={selected ? selected.title : "Relatórios"}
        subtitle="Relatórios comerciais e operacionais"
        record={selected?.title}
        actions={
          selected && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => replace({ page: "reports" })}
            >
              <ArrowLeft size={16} /> Todos os relatórios
            </button>
          )
        }
      />
      {content}
      <p className="footnote">
        Valores originais de vendas: {money(sumBy(state.sales, saleGross))}. Relatórios gerenciais
        demonstrativos — não substituem obrigações fiscais.
      </p>
    </>
  );
}
