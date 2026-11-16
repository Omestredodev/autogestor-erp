import type { Purchase, PurchaseItem } from "../types";
import type { PurchaseInput } from "./commands";
import {
  applyStockChange,
  describeProduct,
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
import { sumBy } from "../../utils/calculations";
import { money } from "../../utils/currency";

export function adjustStock(ctx: Ctx, productId: string, newQuantity: number, reason: string) {
  requirePermission(ctx, "inventory.adjust");
  const product = ctx.state.products.find((item) => item.id === productId);
  ensure(product, "Produto não encontrado.");
  ensure(
    Number.isInteger(newQuantity) && newQuantity >= 0,
    "A nova quantidade deve ser um número inteiro maior ou igual a zero.",
  );
  const difference = newQuantity - product.stock;
  ensure(difference !== 0, "A nova quantidade é igual ao saldo atual. Nenhum ajuste necessário.");
  const justification = requireText(reason, "Informe o motivo do ajuste.");
  ensure(justification.length >= 5, "Descreva o motivo com pelo menos 5 caracteres.");
  const products = [...ctx.state.products];
  const movements = [...ctx.state.movements];
  const adjustmentId = newId(ctx, "adj");
  applyStockChange(ctx, products, movements, {
    productId,
    quantity: difference,
    type: "adjustment",
    refType: "adjustment",
    refId: adjustmentId,
    reason: justification,
  });
  record(ctx, {
    operation: "Ajuste de estoque",
    entityType: "Estoque",
    entityId: productId,
    entityLabel: product.code,
    description: `${describeProduct(product)} · Motivo: ${justification}`,
    before: `${product.stock} un.`,
    after: `${newQuantity} un. (${difference > 0 ? "+" : ""}${difference})`,
    relatedIds: [productId],
  });
  return {
    state: finish(ctx, { products, movements }),
    message: `Estoque de ${product.code} ajustado para ${newQuantity} un.`,
    entityId: productId,
  };
}

function validatePurchase(ctx: Ctx, id: string | undefined, input: PurchaseInput) {
  const supplier = ctx.state.suppliers.find((item) => item.id === input.supplierId);
  ensure(supplier, "Selecione um fornecedor.");
  ensure(supplier.active, "O fornecedor selecionado está inativo.");
  const documentNumber = requireText(input.documentNumber, "Informe o número do documento.");
  ensure(input.date, "Informe a data da compra.");
  ensure(
    !ctx.state.purchases.some(
      (purchase) =>
        purchase.id !== id &&
        purchase.status !== "discarded" &&
        purchase.supplierId === input.supplierId &&
        purchase.documentNumber.trim().toUpperCase() === documentNumber.toUpperCase(),
    ),
    "Já existe uma compra deste fornecedor com o mesmo número de documento.",
  );
  ensure(input.items.length > 0, "Adicione pelo menos um produto à compra.");
  const seen = new Set<string>();
  for (const item of input.items) {
    const product = ctx.state.products.find((candidate) => candidate.id === item.productId);
    ensure(product, "Selecione o produto de todos os itens.");
    ensure(product.active, `O produto ${product.code} está inativo.`);
    ensure(!seen.has(item.productId), `O produto ${product.code} foi informado mais de uma vez.`);
    seen.add(item.productId);
    ensure(isPositiveInteger(item.quantity), `Quantidade inválida para ${product.code}.`);
    ensure(
      Number.isFinite(item.unitCost) && item.unitCost >= 0,
      `Custo unitário inválido para ${product.code}.`,
    );
  }
  return { supplier, documentNumber };
}

export const purchaseTotal = (purchase: Pick<Purchase, "items">) =>
  sumBy(purchase.items, (item) => item.quantity * item.unitCost);

function confirmInto(ctx: Ctx, purchase: Purchase) {
  ensure(purchase.status === "draft", "Esta compra já foi confirmada ou descartada.");
  const products = [...ctx.state.products];
  const movements = [...ctx.state.movements];
  const costChanges: string[] = [];
  for (const item of purchase.items) {
    applyStockChange(ctx, products, movements, {
      productId: item.productId,
      quantity: item.quantity,
      type: "purchase",
      refType: "purchase",
      refId: purchase.id,
      reason: `Entrada por compra ${purchase.number} · Doc. ${purchase.documentNumber}`,
    });
    if (purchase.updateCost) {
      const index = products.findIndex((product) => product.id === item.productId);
      const product = products[index];
      if (product.cost !== item.unitCost) {
        costChanges.push(`${product.code}: ${money(product.cost)} → ${money(item.unitCost)}`);
        // Price remains the saved reference price on purpose.
        products[index] = { ...product, cost: item.unitCost };
      }
    }
  }
  const supplier = ctx.state.suppliers.find((item) => item.id === purchase.supplierId);
  record(ctx, {
    operation: "Compra confirmada",
    entityType: "Compra",
    entityId: purchase.id,
    entityLabel: purchase.number,
    description: `${supplier?.name ?? ""} · Doc. ${purchase.documentNumber} · ${purchase.items.length} itens · ${money(purchaseTotal(purchase))}`,
    before: "Rascunho",
    after: `Confirmada${costChanges.length ? ` · Custos: ${costChanges.join("; ")}` : ""}`,
    relatedIds: [purchase.supplierId, ...purchase.items.map((item) => item.productId)],
  });
  const confirmed: Purchase = {
    ...purchase,
    status: "confirmed",
    confirmedAt: ctx.now,
    confirmedBy: ctx.user.id,
  };
  return { products, movements, confirmed };
}

export function savePurchase(
  ctx: Ctx,
  id: string | undefined,
  input: PurchaseInput,
  confirm: boolean,
) {
  requirePermission(ctx, "purchases.manage");
  const { documentNumber } = validatePurchase(ctx, id, input);
  const existing = id ? ctx.state.purchases.find((item) => item.id === id) : undefined;
  if (id) ensure(existing?.status === "draft", "Somente compras em rascunho podem ser editadas.");
  const purchaseId = existing?.id ?? newId(ctx, "pur");
  const items: PurchaseItem[] = input.items.map((item) => ({ id: newId(ctx, "pit"), ...item }));
  let purchase: Purchase = {
    id: purchaseId,
    number: existing?.number ?? `CP-${String(nextNumber(ctx, "purchaseNumber")).padStart(5, "0")}`,
    supplierId: input.supplierId,
    documentNumber,
    date: input.date,
    status: "draft",
    items,
    notes: input.notes.trim(),
    updateCost: input.updateCost,
    createdAt: existing?.createdAt ?? ctx.now,
    createdBy: existing?.createdBy ?? ctx.user.id,
  };
  record(ctx, {
    operation: existing ? "Rascunho de compra editado" : "Compra registrada",
    entityType: "Compra",
    entityId: purchaseId,
    entityLabel: purchase.number,
    description: `Doc. ${documentNumber} · ${items.length} itens · ${money(purchaseTotal(purchase))}`,
    after: "Rascunho",
    relatedIds: [input.supplierId],
  });
  let products = ctx.state.products;
  let movements = ctx.state.movements;
  if (confirm) {
    const result = confirmInto(ctx, purchase);
    products = result.products;
    movements = result.movements;
    purchase = result.confirmed;
  }
  const purchases = existing
    ? ctx.state.purchases.map((item) => (item.id === purchaseId ? purchase : item))
    : [...ctx.state.purchases, purchase];
  return {
    state: finish(ctx, { purchases, products, movements }),
    message: confirm
      ? `Compra ${purchase.number} confirmada: estoque atualizado.`
      : `Rascunho ${purchase.number} salvo. O estoque não foi alterado.`,
    entityId: purchaseId,
  };
}

export function confirmPurchase(ctx: Ctx, id: string) {
  requirePermission(ctx, "purchases.manage");
  const purchase = ctx.state.purchases.find((item) => item.id === id);
  ensure(purchase, "Compra não encontrada.");
  validatePurchase(ctx, id, purchase);
  const { products, movements, confirmed } = confirmInto(ctx, purchase);
  return {
    state: finish(ctx, {
      products,
      movements,
      purchases: ctx.state.purchases.map((item) => (item.id === id ? confirmed : item)),
    }),
    message: `Compra ${purchase.number} confirmada: estoque atualizado.`,
    entityId: id,
  };
}

export function discardPurchase(ctx: Ctx, id: string) {
  requirePermission(ctx, "purchases.manage");
  const purchase = ctx.state.purchases.find((item) => item.id === id);
  ensure(purchase?.status === "draft", "Somente rascunhos podem ser descartados.");
  record(ctx, {
    operation: "Rascunho de compra descartado",
    entityType: "Compra",
    entityId: id,
    entityLabel: purchase.number,
    description: `Doc. ${purchase.documentNumber}`,
    before: "Rascunho",
    after: "Descartada",
    relatedIds: [purchase.supplierId],
  });
  return {
    state: finish(ctx, {
      purchases: ctx.state.purchases.map((item) =>
        item.id === id ? { ...item, status: "discarded" as const } : item,
      ),
    }),
    message: `Rascunho ${purchase.number} descartado.`,
    entityId: id,
  };
}
