import type { Closing, Payment, Receivable, Sale, SaleItem, SaleReturn } from "../types";
import type { PaymentTarget, SaleInput } from "./commands";
import {
  applyStockChange,
  ensure,
  finish,
  isPositiveInteger,
  newId,
  nextNumber,
  record,
  requirePermission,
  requireText,
  type Ctx,
} from "./core";
import {
  availableToReturn,
  closingBalance,
  customerOpenBalance,
  isSaleEligibleForClosing,
  itemTotal,
  returnedQuantity,
  saleBalance,
  saleGross,
  saleNet,
} from "../rules/finance";
import { round2, money } from "../../utils/currency";
import { sumBy } from "../../utils/calculations";
import { formatDate } from "../../utils/dates";

const EPS = 0.005;

export function createSale(ctx: Ctx, input: SaleInput) {
  requirePermission(ctx, "sales.create");
  const state = ctx.state;
  ensure(input.requestId, "Identificador da operação ausente.");
  ensure(
    !state.sales.some((sale) => sale.requestId === input.requestId),
    "Esta venda já foi registrada.",
  );
  ensure(input.items.length > 0, "Adicione pelo menos um item à venda.");
  const customer = state.customers.find((item) => item.id === input.customerId);
  ensure(customer, "Selecione um cliente ou AO CONSUMIDOR.");
  ensure(customer.active, "O cliente selecionado está inativo.");
  if (customer.generic)
    ensure(
      state.settings.allowGenericCustomer,
      "Vendas AO CONSUMIDOR estão desabilitadas nas configurações.",
    );
  const seller = state.users.find((item) => item.id === input.sellerId);
  ensure(seller?.active, "Selecione um vendedor ativo.");

  const quantities = new Map<string, number>();
  const items: SaleItem[] = input.items.map((line) => {
    const product = state.products.find((item) => item.id === line.productId);
    ensure(product, "Produto da venda não encontrado.");
    ensure(product.active, `O produto ${product.code} está inativo e não pode ser vendido.`);
    ensure(isPositiveInteger(line.quantity), `Quantidade inválida para ${product.code}.`);
    ensure(
      Number.isFinite(line.price) && line.price > 0,
      `Preço praticado inválido para ${product.code}.`,
    );
    const price = round2(line.price);
    if (Math.abs(price - product.price) > EPS) {
      requirePermission(ctx, "sales.priceOverride");
      if (price < product.price) {
        ensure(
          state.settings.allowBelowReference,
          `Preço abaixo da referência não permitido para ${product.code}.`,
        );
      }
    }
    quantities.set(product.id, (quantities.get(product.id) ?? 0) + line.quantity);
    ensure(
      quantities.get(product.id)! <= product.stock,
      `Estoque insuficiente para ${product.code}: disponível ${product.stock} un.`,
    );
    return {
      id: newId(ctx, "sit"),
      productId: product.id,
      code: product.code,
      manufacturerCode: product.manufacturerCode,
      name: product.name,
      quantity: line.quantity,
      unitCost: product.cost,
      referencePrice: product.price,
      price,
    };
  });
  const total = sumBy(items, itemTotal);

  if (input.paymentMode === "deferred") {
    ensure(
      !customer.generic,
      "Pagamento posterior exige um cliente cadastrado. AO CONSUMIDOR não gera conta a receber.",
    );
    ensure(input.dueDate, "Informe o vencimento do pagamento posterior.");
    if (customer.creditLimit > 0) {
      const open = customerOpenBalance(state, customer.id);
      ensure(
        open + total <= customer.creditLimit + EPS,
        `Limite de crédito excedido: em aberto ${money(open)} + venda ${money(total)} > limite ${money(customer.creditLimit)}.`,
      );
    }
  } else {
    ensure(
      input.paymentMethod && input.paymentMethod !== "Crédito do cliente",
      "Selecione a forma de pagamento.",
    );
  }

  const saleId = newId(ctx, "sal");
  const sale: Sale = {
    id: saleId,
    number: `VD-${nextNumber(ctx, "saleNumber")}`,
    requestId: input.requestId,
    customerId: customer.id,
    customerName: customer.name,
    sellerId: seller.id,
    sellerName: seller.name,
    at: ctx.now,
    notes: input.notes.trim(),
    paymentMode: input.paymentMode,
    paymentMethod: input.paymentMode === "immediate" ? input.paymentMethod : undefined,
    dueDate: input.paymentMode === "deferred" ? input.dueDate : undefined,
    items,
    status: "valid",
  };
  const products = [...state.products];
  const movements = [...state.movements];
  for (const item of items) {
    applyStockChange(ctx, products, movements, {
      productId: item.productId,
      quantity: -item.quantity,
      type: "sale",
      refType: "sale",
      refId: saleId,
      reason: `Saída pela venda ${sale.number}`,
    });
  }
  const payments = [...state.payments];
  const receivables = [...state.receivables];
  if (sale.paymentMode === "immediate") {
    payments.push({
      id: newId(ctx, "pay"),
      number: `RC-${String(nextNumber(ctx, "paymentNumber")).padStart(5, "0")}`,
      kind: "receipt",
      amount: total,
      method: sale.paymentMethod!,
      at: ctx.now,
      userId: ctx.user.id,
      customerId: customer.id,
      saleId,
      notes: "Recebimento no ato da venda",
    });
  } else {
    receivables.push({
      id: newId(ctx, "rcv"),
      number: `CR-${String(nextNumber(ctx, "receivableNumber")).padStart(5, "0")}`,
      origin: "sale",
      saleId,
      customerId: customer.id,
      dueDate: sale.dueDate!,
      createdAt: ctx.now,
    });
  }
  record(ctx, {
    operation: "Venda registrada",
    entityType: "Venda",
    entityId: saleId,
    entityLabel: sale.number,
    description: `${customer.name} · ${items.length} itens · ${sale.paymentMode === "immediate" ? sale.paymentMethod : `A prazo até ${formatDate(sale.dueDate)}`}`,
    after: money(total),
    relatedIds: [customer.id, ...items.map((item) => item.productId)],
  });
  return {
    state: finish(ctx, {
      sales: [...state.sales, sale],
      products,
      movements,
      payments,
      receivables,
    }),
    message: `Venda ${sale.number} registrada.`,
    entityId: saleId,
  };
}

export function cancelSale(ctx: Ctx, saleId: string, reason: string) {
  requirePermission(ctx, "sales.cancel");
  const sale = ctx.state.sales.find((item) => item.id === saleId);
  ensure(sale, "Venda não encontrada.");
  ensure(sale.status !== "cancelled", "Esta venda já foi cancelada.");
  const justification = requireText(reason, "Informe o motivo do cancelamento.");
  const valueBefore = saleNet(ctx.state, sale);
  const products = [...ctx.state.products];
  const movements = [...ctx.state.movements];
  const reverted: string[] = [];
  for (const item of sale.items) {
    const remaining = item.quantity - returnedQuantity(ctx.state, item.id);
    if (remaining <= 0) continue;
    applyStockChange(ctx, products, movements, {
      productId: item.productId,
      quantity: remaining,
      type: "cancellation",
      refType: "sale",
      refId: saleId,
      reason: `Reversão do cancelamento da venda ${sale.number}`,
    });
    reverted.push(`${item.code}: +${remaining}`);
  }
  const cancelled: Sale = {
    ...sale,
    status: "cancelled",
    cancelledAt: ctx.now,
    cancelledBy: ctx.user.id,
    cancelReason: justification,
  };
  const sales = ctx.state.sales.map((item) => (item.id === saleId ? cancelled : item));
  const next = { ...ctx.state, sales };
  const refund = Math.max(0, -saleBalance(next, cancelled));
  record(ctx, {
    operation: "Venda cancelada",
    entityType: "Venda",
    entityId: saleId,
    entityLabel: sale.number,
    description: `Motivo: ${justification}${reverted.length ? ` · Estoque revertido: ${reverted.join(", ")}` : ""}${refund > EPS ? ` · Reembolso pendente ${money(refund)}` : ""}`,
    before: `Concluída · ${money(valueBefore)}`,
    after: "CANCELADA · R$ 0,00",
    relatedIds: [sale.customerId, ...sale.items.map((item) => item.productId)],
  });
  return {
    state: finish(ctx, { sales, products, movements }),
    message: `Venda ${sale.number} cancelada. Estoque revertido${refund > EPS ? `; reembolso pendente de ${money(refund)}` : ""}.`,
    entityId: saleId,
  };
}

export function returnSale(
  ctx: Ctx,
  saleId: string,
  reason: string,
  lines: { saleItemId: string; quantity: number }[],
) {
  requirePermission(ctx, "sales.return");
  const sale = ctx.state.sales.find((item) => item.id === saleId);
  ensure(sale, "Venda não encontrada.");
  ensure(sale.status !== "cancelled", "Não é possível registrar devolução de uma venda cancelada.");
  const justification = requireText(reason, "Informe o motivo da devolução.");
  const selected = lines.filter((line) => line.quantity !== 0);
  ensure(selected.length > 0, "Informe a quantidade devolvida de pelo menos um item.");
  const returnId = newId(ctx, "ret");
  const items = selected.map((line) => {
    const item = sale.items.find((candidate) => candidate.id === line.saleItemId);
    ensure(item, "Item da venda não encontrado.");
    ensure(isPositiveInteger(line.quantity), `Quantidade devolvida inválida para ${item.code}.`);
    const available = availableToReturn(ctx.state, item);
    ensure(line.quantity <= available, `${item.code}: só é possível devolver até ${available} un.`);
    return {
      saleItemId: item.id,
      productId: item.productId,
      quantity: line.quantity,
      unitPrice: item.price,
    };
  });
  const saleReturn: SaleReturn = {
    id: returnId,
    number: `DV-${String(nextNumber(ctx, "returnNumber")).padStart(5, "0")}`,
    saleId,
    at: ctx.now,
    userId: ctx.user.id,
    reason: justification,
    items,
  };
  const products = [...ctx.state.products];
  const movements = [...ctx.state.movements];
  for (const item of items) {
    applyStockChange(ctx, products, movements, {
      productId: item.productId,
      quantity: item.quantity,
      type: "return",
      refType: "return",
      refId: returnId,
      reason: `Devolução ${saleReturn.number} da venda ${sale.number}`,
    });
  }
  const value = sumBy(items, (item) => item.quantity * item.unitPrice);
  const before = saleNet(ctx.state, sale);
  const returns = [...ctx.state.returns, saleReturn];
  const next = { ...ctx.state, returns };
  const balance = sale.closingId
    ? closingBalance(
        next,
        next.closings.find((item) => item.id === sale.closingId)!,
      )
    : saleBalance(next, sale);
  const financial =
    balance < -EPS
      ? `Reembolso/crédito pendente de ${money(-balance)}`
      : `Saldo a receber ${money(Math.max(0, balance))}`;
  record(ctx, {
    operation: "Devolução registrada",
    entityType: "Devolução",
    entityId: returnId,
    entityLabel: saleReturn.number,
    description: `Venda ${sale.number} · ${items.map((item) => `${item.quantity} un.`).join(", ")} · ${money(value)} · ${financial}`,
    before: `Líquido ${money(before)}`,
    after: `Líquido ${money(round2(before - value))}`,
    relatedIds: [saleId, sale.customerId, ...items.map((item) => item.productId)],
  });
  return {
    state: finish(ctx, { returns, products, movements }),
    message: `Devolução ${saleReturn.number} registrada (${money(value)}). ${financial}.`,
    entityId: returnId,
  };
}

function resolveTarget(ctx: Ctx, target: PaymentTarget) {
  if ("saleId" in target) {
    const sale = ctx.state.sales.find((item) => item.id === target.saleId);
    ensure(sale, "Venda não encontrada.");
    ensure(
      !sale.closingId,
      "Esta venda está incluída em um fechamento. Registre o pagamento no fechamento.",
    );
    return {
      balance: saleBalance(ctx.state, sale),
      customerId: sale.customerId,
      label: sale.number,
      saleId: sale.id,
      closingId: undefined,
      entityType: "Venda" as const,
    };
  }
  const closing = ctx.state.closings.find((item) => item.id === target.closingId);
  ensure(closing, "Fechamento não encontrado.");
  return {
    balance: closingBalance(ctx.state, closing),
    customerId: closing.customerId,
    label: closing.number,
    saleId: undefined,
    closingId: closing.id,
    entityType: "Fechamento" as const,
  };
}

function addPayment(
  ctx: Ctx,
  kind: Payment["kind"],
  target: PaymentTarget,
  amount: number,
  method: Payment["method"],
  notes: string,
) {
  requirePermission(ctx, "finance.manage");
  const resolved = resolveTarget(ctx, target);
  const value = round2(amount);
  ensure(Number.isFinite(value) && value > 0, "Informe um valor maior que zero.");
  ensure(method, "Selecione a forma de pagamento.");
  if (kind === "receipt") {
    ensure(resolved.balance > EPS, "Não há saldo pendente para receber.");
    ensure(
      value <= resolved.balance + EPS,
      `O valor excede o saldo pendente de ${money(resolved.balance)}.`,
    );
  } else {
    ensure(resolved.balance < -EPS, "Não há reembolso pendente para este registro.");
    ensure(
      value <= -resolved.balance + EPS,
      `O valor excede o reembolso pendente de ${money(-resolved.balance)}.`,
    );
  }
  const payment: Payment = {
    id: newId(ctx, "pay"),
    number: `${kind === "receipt" ? "RC" : "RB"}-${String(nextNumber(ctx, "paymentNumber")).padStart(5, "0")}`,
    kind,
    amount: value,
    method,
    at: ctx.now,
    userId: ctx.user.id,
    customerId: resolved.customerId,
    saleId: resolved.saleId,
    closingId: resolved.closingId,
    notes: notes.trim(),
  };
  const after = round2(kind === "receipt" ? resolved.balance - value : resolved.balance + value);
  record(ctx, {
    operation: kind === "receipt" ? "Pagamento registrado" : "Reembolso registrado",
    entityType: "Pagamento",
    entityId: payment.id,
    entityLabel: payment.number,
    description: `${resolved.entityType} ${resolved.label} · ${method} · ${money(value)}`,
    before: `Saldo ${money(resolved.balance)}`,
    after: `Saldo ${money(after)}`,
    relatedIds: [
      resolved.customerId,
      ...(resolved.saleId ? [resolved.saleId] : []),
      ...(resolved.closingId ? [resolved.closingId] : []),
    ],
  });
  return {
    state: finish(ctx, { payments: [...ctx.state.payments, payment] }),
    message:
      kind === "receipt"
        ? `Pagamento de ${money(value)} registrado em ${resolved.label}. Saldo: ${money(Math.max(0, after))}.`
        : `Reembolso de ${money(value)} registrado em ${resolved.label}.`,
    entityId: payment.id,
  };
}

export const registerPayment = (
  ctx: Ctx,
  target: PaymentTarget,
  amount: number,
  method: Payment["method"],
  notes: string,
) => addPayment(ctx, "receipt", target, amount, method, notes);

export const registerRefund = (
  ctx: Ctx,
  target: PaymentTarget,
  amount: number,
  method: Payment["method"],
  notes: string,
) => addPayment(ctx, "refund", target, amount, method, notes);

export function createClosing(
  ctx: Ctx,
  customerId: string,
  saleIds: string[],
  dueDate: string,
  notes: string,
) {
  requirePermission(ctx, "closings.manage");
  const customer = ctx.state.customers.find((item) => item.id === customerId);
  ensure(customer, "Selecione um cliente.");
  ensure(!customer.generic, "AO CONSUMIDOR não pode ter fechamentos.");
  ensure(saleIds.length > 0, "Selecione pelo menos uma venda.");
  ensure(new Set(saleIds).size === saleIds.length, "Venda selecionada em duplicidade.");
  ensure(dueDate, "Informe o vencimento do fechamento.");
  const sales = saleIds.map((id) => {
    const sale = ctx.state.sales.find((item) => item.id === id);
    ensure(sale, "Venda não encontrada.");
    ensure(sale.customerId === customerId, `A venda ${sale.number} pertence a outro cliente.`);
    ensure(!sale.closingId, `A venda ${sale.number} já está incluída em outro fechamento.`);
    ensure(
      isSaleEligibleForClosing(ctx.state, sale, customer),
      `A venda ${sale.number} não possui saldo elegível.`,
    );
    return sale;
  });
  const total = sumBy(sales, (sale) => saleBalance(ctx.state, sale));
  const dates = sales.map((sale) => sale.at).sort();
  const closing: Closing = {
    id: newId(ctx, "clo"),
    number: `FCH-${String(nextNumber(ctx, "closingNumber")).padStart(4, "0")}`,
    customerId,
    saleIds,
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
    dueDate,
    notes: notes.trim(),
    createdAt: ctx.now,
    createdBy: ctx.user.id,
  };
  const receivable: Receivable = {
    id: newId(ctx, "rcv"),
    number: `CR-${String(nextNumber(ctx, "receivableNumber")).padStart(5, "0")}`,
    origin: "closing",
    closingId: closing.id,
    customerId,
    dueDate,
    createdAt: ctx.now,
  };
  record(ctx, {
    operation: "Fechamento gerado",
    entityType: "Fechamento",
    entityId: closing.id,
    entityLabel: closing.number,
    description: `${customer.name} · Vendas ${sales.map((sale) => sale.number).join(", ")} · Vencimento ${formatDate(dueDate)}`,
    after: money(total),
    relatedIds: [customerId, ...saleIds],
  });
  return {
    state: finish(ctx, {
      closings: [...ctx.state.closings, closing],
      sales: ctx.state.sales.map((sale) =>
        saleIds.includes(sale.id) ? { ...sale, closingId: closing.id } : sale,
      ),
      receivables: [
        ...ctx.state.receivables.map((item) =>
          item.saleId && saleIds.includes(item.saleId) && !item.supersededByClosingId
            ? { ...item, supersededByClosingId: closing.id }
            : item,
        ),
        receivable,
      ],
    }),
    message: `Fechamento ${closing.number} gerado: ${money(total)}.`,
    entityId: closing.id,
  };
}
