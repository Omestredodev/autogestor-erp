import { useState } from "react";
import {
  AlertCircle,
  Boxes,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Package,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Card, Status } from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { CustomerLink, SaleLink } from "../../components/shared/Links";
import { useDeny } from "../../components/shared/permissions";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import type { Route } from "../../app/navigation/routes";
import { useStore } from "../../store/AppProvider";
import {
  categoryRevenue,
  dailyRevenue,
  dashboardMetrics,
  productRanking,
} from "../../store/selectors";
import { saleCommercialLabel, saleFinancialStatus, saleNet } from "../../domain/rules/finance";
import type { Permission } from "../../domain/types";
import { money } from "../../utils/currency";
import {
  formatDateTime,
  formatLongDate,
  formatTime,
  isSameDay,
  periodLabels,
  periodRange,
  type PeriodKey,
} from "../../utils/dates";
import { DataTable } from "../../components/ui";

const PALETTE = ["#2563eb", "#0ea5e9", "#64748b", "#94a3b8", "#cbd5e1"];

const compact = (value: number) =>
  value >= 1000
    ? `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`
    : value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

export function DashboardPage() {
  const { state } = useStore();
  const { navigate, open } = useNavigation();
  const deny = useDeny();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [chartDays, setChartDays] = useState(7);
  const now = new Date();
  const metrics = dashboardMetrics(state, period, now);
  const series = dailyRevenue(state, chartDays, now);
  const range = periodRange(period, now);
  const categories = categoryRevenue(state, range);
  const ranking = productRanking(state, range).slice(0, 5);
  const recent = [...state.sales].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  const stats: {
    label: string;
    value: string;
    hint: string;
    icon: LucideIcon;
    tone: string;
    route: Route;
  }[] = [
    {
      label: "Faturamento hoje",
      value: money(metrics.revenueToday),
      hint: `${metrics.salesToday} venda(s) válida(s) hoje`,
      icon: CircleDollarSign,
      tone: "primary",
      route: { page: "sales" },
    },
    {
      label: "Faturamento no mês",
      value: money(metrics.revenueMonth),
      hint: `Recebido no mês: ${money(metrics.receiptsMonth)}`,
      icon: TrendingUp,
      tone: "primary",
      route: { page: "finance" },
    },
    {
      label: `Vendas válidas · ${periodLabels[period]}`,
      value: String(metrics.periodCount),
      hint: `${metrics.cancelledInPeriod} cancelada(s) no período`,
      icon: ShoppingBag,
      tone: "primary",
      route: { page: "sales" },
    },
    {
      label: `Ticket médio · ${periodLabels[period]}`,
      value: money(metrics.averageTicket),
      hint: `Sobre ${money(metrics.periodRevenue)} líquidos`,
      icon: ReceiptText,
      tone: "info",
      route: { page: "reports", params: { report: "period" } },
    },
    {
      label: "Estoque baixo",
      value: `${metrics.lowStock.length} produto(s)`,
      hint: `${metrics.lowStock.filter((product) => product.stock === 0).length} sem estoque`,
      icon: AlertCircle,
      tone: "warning",
      route: { page: "inventory" },
    },
    {
      label: "Contas a receber",
      value: money(metrics.receivable),
      hint: `${metrics.receivableCount} título(s) com saldo`,
      icon: CreditCard,
      tone: "info",
      route: { page: "finance", tab: "Contas a receber" },
    },
    {
      label: "Fechamentos pendentes",
      value: String(metrics.openClosings.length),
      hint: money(metrics.openClosingsValue),
      icon: ClipboardList,
      tone: "warning",
      route: { page: "closings" },
    },
    {
      label: "Lembretes pendentes",
      value: String(metrics.pendingReminders),
      hint: metrics.nextReminder
        ? `Próximo: ${isSameDay(metrics.nextReminder.notifyAt, now) ? formatTime(metrics.nextReminder.notifyAt) : `${formatDateTime(metrics.nextReminder.notifyAt).slice(0, 5)} ${formatTime(metrics.nextReminder.notifyAt)}`} · ${metrics.todaysReminders} hoje/vencidos`
        : `${metrics.todaysReminders} hoje/vencidos`,
      icon: CalendarClock,
      tone: "warning",
      route: { page: "reminders" },
    },
  ];

  const max = Math.max(1, ...series.map((point) => point.revenue));
  const width = 700;
  const height = 190;
  const points = series.map(
    (point, index) =>
      [
        series.length === 1 ? width / 2 : (index / (series.length - 1)) * width,
        height - 10 - (point.revenue / max) * (height - 30),
      ] as const,
  );
  const line = points
    .map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width} ${height} L0 ${height}Z`;
  const totalCategories = categories.reduce((sum, item) => sum + item.revenue, 0);
  let cursor = 0;
  const gradient = categories.length
    ? `conic-gradient(${categories
        .slice(0, 5)
        .map((item, index) => {
          const share =
            index === Math.min(4, categories.length - 1)
              ? 100 - cursor
              : (item.revenue / totalCategories) * 100;
          const segment = `${PALETTE[index]} ${cursor}% ${cursor + share}%`;
          cursor += share;
          return segment;
        })
        .join(", ")})`
    : "var(--panel-2)";
  const legend = categories.slice(0, 4).concat(
    categories.length > 4
      ? [
          {
            name: "Outros",
            revenue: categories.slice(4).reduce((sum, item) => sum + item.revenue, 0),
          },
        ]
      : [],
  );
  const topMax = Math.max(1, ...ranking.map((item) => item.revenue));

  const quick: {
    label: string;
    hint: string;
    icon: LucideIcon;
    tone: string;
    action: () => void;
    permission?: Permission;
  }[] = [
    {
      label: "Nova venda",
      hint: "Iniciar atendimento",
      icon: ShoppingCart,
      tone: "blue",
      action: () => open({ type: "pos" }),
      permission: "sales.create",
    },
    {
      label: "Cadastrar produto",
      hint: "Adicionar ao catálogo",
      icon: Package,
      tone: "violet",
      action: () => open({ type: "product-form" }),
      permission: "products.manage",
    },
    {
      label: "Registrar compra",
      hint: "Entrada de mercadoria",
      icon: Truck,
      tone: "green",
      action: () => open({ type: "purchase-form" }),
      permission: "purchases.manage",
    },
    {
      label: "Consultar estoque",
      hint: "Ver saldos e alertas",
      icon: Boxes,
      tone: "orange",
      action: () => navigate({ page: "inventory" }),
      permission: "inventory.view",
    },
    {
      label: "Criar lembrete",
      hint: "Agendar uma tarefa",
      icon: CalendarClock,
      tone: "red",
      action: () => open({ type: "reminder-form" }),
      permission: "reminders.manage",
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Visão geral da operação · ${formatLongDate(now)}`}
        actions={
          <select
            className="header-select"
            value={period}
            onChange={(event) => setPeriod(event.target.value as PeriodKey)}
            aria-label="Período dos indicadores"
          >
            {(["today", "7d", "30d", "month"] as PeriodKey[]).map((value) => (
              <option key={value} value={value}>
                {periodLabels[value]}
              </option>
            ))}
          </select>
        }
      />
      <div className="page-stack">
        <section className="stats-grid">
          {stats.map(({ label, value, hint, icon: Icon, tone, route }) => (
            <button type="button" className="stat-card" key={label} onClick={() => navigate(route)}>
              <div className={`stat-icon ${tone}`}>
                <Icon size={20} />
              </div>
              <div className="stat-label">
                {label}
                <ChevronRight size={15} />
              </div>
              <strong>{value}</strong>
              <small className={tone}>{hint}</small>
            </button>
          ))}
        </section>
        <section className="dashboard-grid">
          <Card
            title="Evolução de vendas"
            subtitle={`Faturamento líquido diário · ${money(series.reduce((sum, point) => sum + point.revenue, 0))} em ${chartDays} dias`}
            className="chart-card"
            action={
              <select
                value={chartDays}
                onChange={(event) => setChartDays(Number(event.target.value))}
                aria-label="Período do gráfico"
              >
                <option value={7}>Últimos 7 dias</option>
                <option value={14}>Últimos 14 dias</option>
                <option value={30}>Últimos 30 dias</option>
              </select>
            }
          >
            <div className="line-chart">
              <div className="chart-y">
                <span>{compact(max)}</span>
                <span>{compact((max * 2) / 3)}</span>
                <span>{compact(max / 3)}</span>
                <span>0</span>
              </div>
              <svg
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="Gráfico de faturamento diário"
              >
                <defs>
                  <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopOpacity=".24" />
                    <stop offset="1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  className="grid-line"
                  d={`M0 20H${width}M0 73H${width}M0 126H${width}M0 180H${width}`}
                />
                <path className="area" d={area} />
                <path className="line" d={line} />
                {points.map(([x, y], index) => (
                  <circle key={series[index].date} className="chart-dot" cx={x} cy={y} r="3.5">
                    <title>
                      {series[index].label}: {money(series[index].revenue)} · {series[index].count}{" "}
                      venda(s)
                    </title>
                  </circle>
                ))}
              </svg>
              <div className="chart-x">
                {series
                  .filter(
                    (_, index) =>
                      chartDays <= 7 ||
                      index % Math.ceil(chartDays / 7) === 0 ||
                      index === series.length - 1,
                  )
                  .map((point) => (
                    <span key={point.date}>{point.label}</span>
                  ))}
              </div>
            </div>
          </Card>
          <Card title="Categorias com maior faturamento" subtitle={periodLabels[period]}>
            <div className="donut-wrap">
              <div className="donut" style={{ background: gradient }}>
                <div>
                  <strong>{money(totalCategories)}</strong>
                  <small>Total</small>
                </div>
              </div>
              <div className="legend">
                {legend.length === 0 && <span>Sem vendas no período</span>}
                {legend.map((item, index) => (
                  <div key={item.name}>
                    <i style={{ background: PALETTE[index] }} />
                    <span>{item.name}</span>
                    <strong>
                      {totalCategories ? Math.round((item.revenue / totalCategories) * 100) : 0}%
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>
        <section className="dashboard-grid lower">
          <Card
            title="Vendas recentes"
            subtitle="Últimas vendas registradas"
            className="recent-sales"
            action={
              <button
                type="button"
                className="link-button"
                onClick={() => navigate({ page: "sales" })}
              >
                Ver todas <ChevronRight size={15} />
              </button>
            }
          >
            <DataTable headers={["Venda", "Cliente", "Vendedor", "Data", "Valor", "Status"]}>
              {recent.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <SaleLink id={sale.id} />
                  </td>
                  <td>
                    <CustomerLink id={sale.customerId} />
                  </td>
                  <td>{sale.sellerName}</td>
                  <td>{formatDateTime(sale.at)}</td>
                  <td>
                    <strong>{money(saleNet(state, sale))}</strong>
                  </td>
                  <td>
                    <Status
                      value={
                        sale.status === "cancelled"
                          ? "Cancelada"
                          : saleFinancialStatus(state, sale) === "Pago"
                            ? saleCommercialLabel(state, sale)
                            : saleFinancialStatus(state, sale)
                      }
                    />
                  </td>
                </tr>
              ))}
            </DataTable>
          </Card>
          <Card title="Ações rápidas" subtitle="Atalhos mais utilizados">
            <div className="quick-actions">
              {quick.map(({ label, hint, icon: Icon, tone, action, permission }) => {
                const reason = permission ? deny(permission) : undefined;
                return (
                  <button
                    type="button"
                    key={label}
                    onClick={action}
                    disabled={Boolean(reason)}
                    title={reason}
                  >
                    <span className={tone}>
                      <Icon size={20} />
                    </span>
                    <div>
                      <strong>{label}</strong>
                      <small>{reason ? "Indisponível para este perfil" : hint}</small>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                );
              })}
            </div>
          </Card>
        </section>
        <Card
          title="Produtos mais vendidos"
          subtitle={`${periodLabels[period]} · quantidades líquidas de devoluções`}
          action={
            <button
              type="button"
              className="link-button"
              onClick={() => navigate({ page: "reports", params: { report: "products" } })}
            >
              Relatório <ChevronRight size={15} />
            </button>
          }
        >
          <div className="bar-list">
            {ranking.length === 0 && <p className="muted-text">Sem vendas no período.</p>}
            {ranking.map((item) => (
              <button
                type="button"
                key={item.productId}
                onClick={() =>
                  navigate({ page: "products", id: item.productId, tab: "Histórico de vendas" })
                }
              >
                <span>
                  <strong>{item.code}</strong> {item.name}
                </span>
                <div className="bar-track">
                  <i style={{ width: `${(item.revenue / topMax) * 100}%` }} />
                </div>
                <small>
                  {item.quantity} un. · {money(item.revenue)}
                </small>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
