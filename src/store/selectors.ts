import type { AppState, Customer, Product, Reminder, Sale } from "../domain/types";
import {
  activeReceivables,
  closingBalance,
  closingStatus,
  itemTotal,
  pendingRefunds,
  returnedQuantity,
  saleNet,
  totalReceivable,
} from "../domain/rules/finance";
import { sumBy } from "../utils/calculations";
import { round2 } from "../utils/currency";
import {
  addDays,
  inRange,
  isSameDay,
  isSameMonth,
  periodRange,
  startOfDay,
  toInputDate,
  type PeriodKey,
} from "../utils/dates";

export const byId = <T extends { id: string }>(items: T[], id?: string) =>
  id ? items.find((item) => item.id === id) : undefined;

export const brandName = (state: AppState, id: string) => byId(state.brands, id)?.name ?? "—";
export const categoryName = (state: AppState, id: string) =>
  byId(state.categories, id)?.name ?? "—";
export const userName = (state: AppState, id?: string) => byId(state.users, id)?.name ?? "—";
export const customerName = (state: AppState, id?: string) =>
  byId(state.customers, id)?.name ?? "—";
export const supplierName = (state: AppState, id?: string) =>
  byId(state.suppliers, id)?.name ?? "—";

export type StockSituation = "Sem estoque" | "Estoque baixo" | "Acima do máximo" | "Normal";

export function stockSituation(product: Product): StockSituation {
  if (product.stock <= 0) return "Sem estoque";
  if (product.stock <= product.min) return "Estoque baixo";
  if (product.stock > product.max) return "Acima do máximo";
  return "Normal";
}

export const lowStockProducts = (state: AppState) =>
  state.products.filter((product) => product.active && product.stock <= product.min);

export const validSales = (state: AppState) =>
  state.sales.filter((sale) => sale.status === "valid");

export function revenueIn(state: AppState, range: { from?: Date; to?: Date }) {
  return sumBy(
    validSales(state).filter((sale) => inRange(sale.at, range)),
    (sale) => saleNet(state, sale),
  );
}

export function receiptsIn(state: AppState, range: { from?: Date; to?: Date }) {
  return round2(
    state.payments
      .filter((payment) => inRange(payment.at, range))
      .reduce(
        (total, payment) => total + (payment.kind === "receipt" ? payment.amount : -payment.amount),
        0,
      ),
  );
}

export function dashboardMetrics(state: AppState, period: PeriodKey, now = new Date()) {
  const range = periodRange(period, now);
  const periodSales = validSales(state).filter((sale) => inRange(sale.at, range));
  const periodRevenue = sumBy(periodSales, (sale) => saleNet(state, sale));
  const openClosings = state.closings.filter((closing) => closingBalance(state, closing) > 0.005);
  const pending = state.reminders.filter((reminder) => reminder.status === "pending");
  const todaysReminders = pending.filter(
    (reminder) => isSameDay(reminder.dueAt, now) || new Date(reminder.dueAt) < now,
  );
  const nextReminder = [...pending]
    .sort((a, b) => a.notifyAt.localeCompare(b.notifyAt))
    .find((reminder) => new Date(reminder.notifyAt) >= now);
  return {
    revenueToday: sumBy(
      validSales(state).filter((sale) => isSameDay(sale.at, now)),
      (sale) => saleNet(state, sale),
    ),
    salesToday: validSales(state).filter((sale) => isSameDay(sale.at, now)).length,
    revenueMonth: sumBy(
      validSales(state).filter((sale) => isSameMonth(sale.at, now)),
      (sale) => saleNet(state, sale),
    ),
    receiptsMonth: receiptsIn(state, periodRange("month", now)),
    periodCount: periodSales.length,
    periodRevenue,
    averageTicket: periodSales.length ? round2(periodRevenue / periodSales.length) : 0,
    lowStock: lowStockProducts(state),
    receivable: totalReceivable(state),
    receivableCount: activeReceivables(state).filter((item) => item.balance > 0.005).length,
    openClosings,
    openClosingsValue: sumBy(openClosings, (closing) => closingBalance(state, closing)),
    pendingReminders: pending.length,
    todaysReminders: todaysReminders.length,
    nextReminder,
    cancelledInPeriod: state.sales.filter(
      (sale) => sale.status === "cancelled" && sale.cancelledAt && inRange(sale.cancelledAt, range),
    ).length,
    pendingRefunds: sumBy(pendingRefunds(state), (item) => item.amount),
  };
}

export function dailyRevenue(state: AppState, days: number, now = new Date()) {
  const start = startOfDay(addDays(now, -(days - 1)));
  return Array.from({ length: days }, (_, index) => {
    const day = addDays(start, index);
    const sales = validSales(state).filter((sale) => isSameDay(sale.at, day));
    return {
      date: toInputDate(day),
      label: `${String(day.getDate()).padStart(2, "0")}/${String(day.getMonth() + 1).padStart(2, "0")}`,
      revenue: sumBy(sales, (sale) => saleNet(state, sale)),
      count: sales.length,
    };
  });
}

/** Net quantities and values per product (returns deducted, cancelled sales excluded). */
export function productRanking(state: AppState, range: { from?: Date; to?: Date }) {
  const map = new Map<
    string,
    { productId: string; code: string; name: string; quantity: number; revenue: number }
  >();
  for (const sale of validSales(state).filter((item) => inRange(item.at, range))) {
    for (const item of sale.items) {
      const quantity = item.quantity - returnedQuantity(state, item.id);
      if (quantity <= 0) continue;
      const entry = map.get(item.productId) ?? {
        productId: item.productId,
        code: item.code,
        name: item.name,
        quantity: 0,
        revenue: 0,
      };
      entry.quantity += quantity;
      entry.revenue = round2(entry.revenue + quantity * item.price);
      map.set(item.productId, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export function categoryRevenue(state: AppState, range: { from?: Date; to?: Date }) {
  const map = new Map<string, number>();
  for (const entry of productRanking(state, range)) {
    const product = byId(state.products, entry.productId);
    const name = product ? categoryName(state, product.categoryId) : "Outros";
    map.set(name, round2((map.get(name) ?? 0) + entry.revenue));
  }
  return [...map.entries()]
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function sellerRanking(state: AppState, range: { from?: Date; to?: Date }) {
  const map = new Map<string, { sellerId: string; name: string; count: number; revenue: number }>();
  for (const sale of validSales(state).filter((item) => inRange(item.at, range))) {
    const entry = map.get(sale.sellerId) ?? {
      sellerId: sale.sellerId,
      name: sale.sellerName,
      count: 0,
      revenue: 0,
    };
    entry.count += 1;
    entry.revenue = round2(entry.revenue + saleNet(state, sale));
    map.set(sale.sellerId, entry);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export function equivalentsOf(state: AppState, productId: string) {
  return state.equivalences
    .filter(
      (relation) =>
        relation.active && (relation.productAId === productId || relation.productBId === productId),
    )
    .map((relation) => ({
      relation,
      product: byId(
        state.products,
        relation.productAId === productId ? relation.productBId : relation.productAId,
      )!,
    }))
    .filter((entry) => entry.product);
}

export const applicationsOf = (state: AppState, productId: string) =>
  state.applications
    .filter((application) => application.active && application.productId === productId)
    .map((application) => ({ application, vehicle: byId(state.vehicles, application.vehicleId)! }))
    .filter((entry) => entry.vehicle);

export const vehicleLabel = (vehicle: {
  maker: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  engine: string;
  version: string;
}) =>
  `${vehicle.maker} ${vehicle.model} ${vehicle.yearFrom}–${vehicle.yearTo} · ${vehicle.engine} · ${vehicle.version}`;

export const customerSales = (state: AppState, customerId: string) =>
  state.sales
    .filter((sale) => sale.customerId === customerId)
    .sort((a, b) => b.at.localeCompare(a.at));

export const productSaleLines = (state: AppState, productId: string) =>
  state.sales
    .flatMap((sale) =>
      sale.items
        .filter((item) => item.productId === productId)
        .map((item) => ({
          sale,
          item,
          total: itemTotal(item),
          returned: returnedQuantity(state, item.id),
        })),
    )
    .sort((a, b) => b.sale.at.localeCompare(a.sale.at));

export const relatedAudit = (state: AppState, id: string) =>
  state.audit
    .filter((event) => event.entityId === id || event.relatedIds?.includes(id))
    .sort((a, b) => b.at.localeCompare(a.at));

export const isReminderDue = (reminder: Reminder, now = new Date()) =>
  reminder.status === "pending" && new Date(reminder.notifyAt) <= now;

export const visibleReminders = (state: AppState, userId: string) =>
  state.reminders.filter((reminder) => reminder.sharing === "team" || reminder.ownerId === userId);

export function reminderBadge(state: AppState, userId: string, now = new Date()) {
  return visibleReminders(state, userId).filter(
    (reminder) =>
      reminder.status === "pending" &&
      (isSameDay(reminder.dueAt, now) || new Date(reminder.notifyAt) <= now),
  ).length;
}

export function closingSummary(state: AppState, closingId: string) {
  const closing = byId(state.closings, closingId);
  return closing
    ? { closing, balance: closingBalance(state, closing), status: closingStatus(state, closing) }
    : undefined;
}

export const activeCustomers = (state: AppState) =>
  state.customers.filter((customer) => customer.active);

export const customerLabel = (customer: Customer) =>
  customer.generic ? "AO CONSUMIDOR" : customer.name;

export const saleLabel = (sale: Sale) => `${sale.number} · ${sale.customerName}`;
