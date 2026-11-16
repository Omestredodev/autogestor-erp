import { describe, expect, it } from "vitest";
import type { AppState } from "../types";
import { executeCommand, type Command } from "../services";
import {
  closingBalance,
  closingStatus,
  saleBalance,
  saleNet,
  totalReceivable,
} from "../rules/finance";
import { createSeedState } from "../../store/seed";
import { parseStored, serializeState } from "../../store/persistence";
import { dashboardMetrics, equivalentsOf, relatedAudit } from "../../store/selectors";
import { toInputDate } from "../../utils/dates";

let clock = new Date();
const tick = () => {
  clock = new Date(clock.getTime() + 60_000);
  return clock.toISOString();
};

function apply(state: AppState, command: Command) {
  const result = executeCommand(state, command, tick());
  if (!result.ok) throw new Error(result.error);
  return { state: result.state, id: result.entityId!, message: result.message };
}

function reject(state: AppState, command: Command) {
  const result = executeCommand(state, command, tick());
  expect(result.ok).toBe(false);
  return result.ok ? "" : result.error;
}

const product = (state: AppState, code: string) =>
  state.products.find((item) => item.code === code)!;
const movementsOf = (state: AppState, productId: string) =>
  state.movements.filter((item) => item.productId === productId);

const newProduct = (
  code: string,
  name: string,
  extra: Partial<Parameters<typeof baseProduct>[0]> = {},
) => baseProduct({ code, name, ...extra });
function baseProduct(input: {
  code: string;
  name: string;
  cost?: number;
  margin?: number;
  initialStock?: number;
  manufacturerCode?: string;
}) {
  return {
    code: input.code,
    manufacturerCode: input.manufacturerCode ?? `${input.code}-MFR`,
    ean: "",
    oemCode: "",
    name: input.name,
    brandId: "brd_7",
    categoryId: "cat_1",
    unit: "UN",
    cost: input.cost ?? 35,
    margin: input.margin ?? 0.4,
    initialStock: input.initialStock ?? 10,
    min: 2,
    max: 20,
    location: "Z-01-01",
    notes: "",
    applyPrice: true,
  };
}

describe("seed", () => {
  it("builds consistent demo data with AG-00124 at 24 units", () => {
    const state = createSeedState(clock);
    expect(product(state, "AG-00124").stock).toBe(24);
    for (const item of state.products) {
      const sum = movementsOf(state, item.id).reduce(
        (total, movement) => total + movement.quantity,
        0,
      );
      expect(sum).toBe(item.stock);
    }
    expect(state.sales.length).toBeGreaterThan(10);
    expect(state.audit.length).toBeGreaterThan(10);
  });
});

describe("Cenário A — compra, venda, devolução e cancelamento", () => {
  it("keeps stock and movements consistent", () => {
    let state = createSeedState(clock);
    const target = product(state, "AG-00124");
    expect(target.stock).toBe(24);

    const purchase = apply(state, {
      type: "purchase.save",
      input: {
        supplierId: "sup_paulista",
        documentNumber: "NF-TESTE-1",
        date: toInputDate(clock),
        notes: "",
        updateCost: true,
        items: [{ productId: target.id, quantity: 10, unitCost: 19.9 }],
      },
      confirm: true,
    });
    state = purchase.state;
    expect(product(state, "AG-00124").stock).toBe(34);
    expect(product(state, "AG-00124").cost).toBe(19.9);
    expect(product(state, "AG-00124").price).toBe(target.price);
    reject(state, { type: "purchase.confirm", id: purchase.id });
    expect(product(state, "AG-00124").stock).toBe(34);

    const sale = apply(state, {
      type: "sale.create",
      input: {
        requestId: "req-a",
        customerId: "cus_avenida",
        sellerId: "usr_admin",
        notes: "Teste A",
        paymentMode: "immediate",
        paymentMethod: "PIX",
        items: [{ productId: target.id, quantity: 2, price: 30 }],
      },
    });
    state = sale.state;
    expect(product(state, "AG-00124").stock).toBe(32);
    reject(state, {
      type: "sale.create",
      input: {
        requestId: "req-a",
        customerId: "cus_avenida",
        sellerId: "usr_admin",
        notes: "",
        paymentMode: "immediate",
        paymentMethod: "PIX",
        items: [{ productId: target.id, quantity: 2, price: 30 }],
      },
    });
    const createdSale = state.sales.find((item) => item.id === sale.id)!;
    expect(createdSale.items[0].referencePrice).toBe(target.price);
    expect(createdSale.items[0].price).toBe(30);
    expect(product(state, "AG-00124").price).toBe(target.price);

    const itemId = createdSale.items[0].id;
    state = apply(state, {
      type: "sale.return",
      saleId: sale.id,
      reason: "Teste",
      items: [{ saleItemId: itemId, quantity: 1 }],
    }).state;
    expect(product(state, "AG-00124").stock).toBe(33);
    reject(state, {
      type: "sale.return",
      saleId: sale.id,
      reason: "Excesso",
      items: [{ saleItemId: itemId, quantity: 2 }],
    });
    expect(
      saleBalance(
        state,
        state.sales.find((item) => item.id === sale.id)!,
      ),
    ).toBe(-30);

    state = apply(state, {
      type: "sale.cancel",
      saleId: sale.id,
      reason: "Teste de cancelamento",
    }).state;
    expect(product(state, "AG-00124").stock).toBe(34);
    reject(state, { type: "sale.cancel", saleId: sale.id, reason: "Repetido" });
    expect(product(state, "AG-00124").stock).toBe(34);

    const cancelled = state.sales.find((item) => item.id === sale.id)!;
    expect(cancelled.status).toBe("cancelled");
    expect(saleNet(state, cancelled)).toBe(0);
    expect(saleBalance(state, cancelled)).toBe(-60);
    const types = movementsOf(state, target.id)
      .slice(-4)
      .map((item) => [item.type, item.quantity]);
    expect(types).toEqual([
      ["purchase", 10],
      ["sale", -2],
      ["return", 1],
      ["cancellation", 1],
    ]);
    state = apply(state, {
      type: "payment.refund",
      target: { saleId: sale.id },
      amount: 60,
      method: "PIX",
      notes: "",
    }).state;
    expect(saleBalance(state, cancelled)).toBe(0);
  });
});

describe("Cenário B — novo produto", () => {
  it("creates with form values, validates and edits price", () => {
    let state = createSeedState(clock);
    const created = apply(state, {
      type: "product.save",
      input: newProduct("AG-90001", "Junta do cabeçote", {
        cost: 35,
        margin: 0.4,
        initialStock: 7,
      }),
    });
    state = created.state;
    const saved = state.products.find((item) => item.id === created.id)!;
    expect(saved).toMatchObject({
      code: "AG-90001",
      name: "Junta do cabeçote",
      cost: 35,
      margin: 0.4,
      price: 58.33,
      stock: 7,
      min: 2,
      max: 20,
    });
    reject(state, { type: "product.save", input: newProduct("AG-90001", "Duplicado") });
    reject(state, {
      type: "product.save",
      input: newProduct("AG-90002", "Margem inválida", { margin: 1 }),
    });
    reject(state, {
      type: "product.save",
      input: newProduct("AG-90003", "Custo negativo", { cost: -1 }),
    });
    state = apply(state, {
      type: "product.save",
      id: created.id,
      input: {
        ...newProduct("AG-90001", "Junta do cabeçote", { cost: 35, margin: 0.5 }),
        applyPrice: true,
      },
    }).state;
    expect(state.products.find((item) => item.id === created.id)!.price).toBe(70);
    expect(state.products.find((item) => item.id === created.id)!.stock).toBe(7);
    state = apply(state, { type: "product.toggleActive", id: created.id }).state;
    reject(state, {
      type: "sale.create",
      input: {
        requestId: "req-b",
        customerId: "cus_consumer",
        sellerId: "usr_admin",
        notes: "",
        paymentMode: "immediate",
        paymentMethod: "PIX",
        items: [{ productId: created.id, quantity: 1, price: 70 }],
      },
    });
  });
});

describe("Cenário C — cliente e fechamento", () => {
  it("consolidates deferred sales and tracks partial payment", () => {
    let state = createSeedState(clock);
    const customer = apply(state, {
      type: "customer.save",
      input: {
        name: "Oficina Teste",
        document: "11.222.333/0001-81",
        phone: "",
        email: "teste@oficina.com",
        address: "",
        type: "Oficina",
        paymentTerms: "Fechamento mensal",
        creditLimit: 0,
        notes: "",
      },
    });
    state = customer.state;
    const filter = product(state, "AG-00351");
    const deferred = (requestId: string, quantity: number) =>
      apply(state, {
        type: "sale.create",
        input: {
          requestId,
          customerId: customer.id,
          sellerId: "usr_admin",
          notes: "",
          paymentMode: "deferred",
          dueDate: toInputDate(clock),
          items: [{ productId: filter.id, quantity, price: 40 }],
        },
      });
    const first = deferred("req-c1", 2);
    state = first.state;
    const second = deferred("req-c2", 3);
    state = second.state;
    const before = totalReceivable(state);
    reject(state, {
      type: "sale.create",
      input: {
        requestId: "req-c3",
        customerId: "cus_consumer",
        sellerId: "usr_admin",
        notes: "",
        paymentMode: "deferred",
        dueDate: toInputDate(clock),
        items: [{ productId: filter.id, quantity: 1, price: 40 }],
      },
    });

    const closing = apply(state, {
      type: "closing.create",
      customerId: customer.id,
      saleIds: [first.id, second.id],
      dueDate: toInputDate(clock),
      notes: "",
    });
    state = closing.state;
    const record = state.closings.find((item) => item.id === closing.id)!;
    expect(closingBalance(state, record)).toBe(200);
    expect(totalReceivable(state)).toBe(before);
    reject(state, {
      type: "closing.create",
      customerId: customer.id,
      saleIds: [first.id],
      dueDate: toInputDate(clock),
      notes: "",
    });
    reject(state, {
      type: "payment.register",
      target: { saleId: first.id },
      amount: 10,
      method: "PIX",
      notes: "",
    });
    reject(state, {
      type: "payment.register",
      target: { closingId: closing.id },
      amount: 250,
      method: "PIX",
      notes: "",
    });

    state = apply(state, {
      type: "payment.register",
      target: { closingId: closing.id },
      amount: 80,
      method: "PIX",
      notes: "Parcial",
    }).state;
    expect(closingBalance(state, record)).toBe(120);
    expect(closingStatus(state, record)).toBe("Parcialmente pago");
    expect(totalReceivable(state)).toBe(before - 80);
    expect(state.sales.filter((sale) => sale.closingId === closing.id)).toHaveLength(2);
    const metrics = dashboardMetrics(state, "month", clock);
    expect(metrics.receivable).toBe(totalReceivable(state));

    state = apply(state, {
      type: "payment.register",
      target: { closingId: closing.id },
      amount: 120,
      method: "Dinheiro",
      notes: "",
    }).state;
    expect(closingStatus(state, record)).toBe("Pago");
  });
});

describe("Cenário D — equivalência", () => {
  it("is bidirectional, unique and soft-removed", () => {
    let state = createSeedState(clock);
    const a = apply(state, { type: "product.save", input: newProduct("AG-91001", "Produto A") });
    state = a.state;
    const b = apply(state, { type: "product.save", input: newProduct("AG-91002", "Produto B") });
    state = b.state;
    const relation = apply(state, {
      type: "equivalence.create",
      productAId: a.id,
      productBId: b.id,
      notes: "",
    });
    state = relation.state;
    expect(equivalentsOf(state, a.id).map((entry) => entry.product.id)).toEqual([b.id]);
    expect(equivalentsOf(state, b.id).map((entry) => entry.product.id)).toEqual([a.id]);
    reject(state, { type: "equivalence.create", productAId: b.id, productBId: a.id, notes: "" });
    reject(state, { type: "equivalence.create", productAId: a.id, productBId: a.id, notes: "" });
    state = apply(state, { type: "equivalence.remove", id: relation.id }).state;
    expect(equivalentsOf(state, a.id)).toHaveLength(0);
    expect(state.equivalences.find((item) => item.id === relation.id)?.active).toBe(false);
    expect(relatedAudit(state, a.id).map((event) => event.operation)).toEqual(
      expect.arrayContaining(["Equivalência adicionada", "Equivalência removida"]),
    );
  });
});

describe("Cenário E — lembrete", () => {
  it("links, postpones and completes", () => {
    let state = createSeedState(clock);
    const saleId = state.sales[state.sales.length - 1].id;
    const created = apply(state, {
      type: "reminder.save",
      input: {
        title: "Ligar sobre a venda",
        description: "",
        dueAt: new Date(clock.getTime() - 60_000).toISOString(),
        ownerId: "usr_admin",
        sharing: "team",
        saleId,
      },
    });
    state = created.state;
    const before = state.reminders.find((item) => item.id === created.id)!;
    expect(before.saleId).toBe(saleId);
    state = apply(state, { type: "reminder.postpone", id: created.id, minutes: 30 }).state;
    const postponed = state.reminders.find((item) => item.id === created.id)!;
    expect(new Date(postponed.notifyAt).getTime()).toBeGreaterThan(
      new Date(before.notifyAt).getTime(),
    );
    state = apply(state, { type: "reminder.setStatus", id: created.id, status: "done" }).state;
    expect(state.reminders.find((item) => item.id === created.id)!.status).toBe("done");
    reject(state, { type: "reminder.setStatus", id: created.id, status: "cancelled" });
    expect(relatedAudit(state, created.id).map((event) => event.operation)).toEqual([
      "Lembrete concluído",
      "Lembrete adiado",
      "Lembrete criado",
    ]);
  });
});

describe("Cenário F — persistência", () => {
  it("round-trips and rejects invalid data", () => {
    let state = createSeedState(clock);
    const created = apply(state, {
      type: "product.save",
      input: newProduct("AG-92001", "Produto persistido"),
    });
    state = created.state;
    const sale = apply(state, {
      type: "sale.create",
      input: {
        requestId: "req-f",
        customerId: "cus_consumer",
        sellerId: "usr_admin",
        notes: "Obs F",
        paymentMode: "immediate",
        paymentMethod: "Dinheiro",
        items: [{ productId: created.id, quantity: 1, price: 58.33 }],
      },
    });
    state = sale.state;
    state = apply(state, {
      type: "reminder.save",
      input: {
        title: "Lembrete F",
        description: "",
        dueAt: clock.toISOString(),
        ownerId: "usr_admin",
        sharing: "team",
        saleId: sale.id,
        productId: created.id,
      },
    }).state;
    const restored = parseStored(serializeState(state));
    expect(restored.status).toBe("restored");
    expect(restored.state!.reminders.at(-1)).toMatchObject({
      saleId: sale.id,
      productId: created.id,
    });
    expect(restored.state!.sales.find((item) => item.id === sale.id)!.items[0].productId).toBe(
      created.id,
    );
    expect(parseStored("{broken").status).toBe("invalid");
    expect(parseStored(JSON.stringify({ version: 99, data: {} })).status).toBe("outdated");
  });
});

describe("Cenário G — permissões", () => {
  it("enforces permissions inside business actions", () => {
    let state = createSeedState(clock);
    state = apply(state, { type: "session.switchRole", roleId: "role_seller" }).state;
    const saleId = state.sales.find((sale) => sale.status === "valid")!.id;
    expect(reject(state, { type: "sale.cancel", saleId, reason: "Sem permissão" })).toMatch(
      /permissão/,
    );
    reject(state, {
      type: "stock.adjust",
      productId: state.products[0].id,
      newQuantity: 1,
      reason: "Teste sem permissão",
    });
    reject(state, { type: "product.save", input: newProduct("AG-93001", "Sem permissão") });
    const seller = state.session.userId;
    const sale = apply(state, {
      type: "sale.create",
      input: {
        requestId: "req-g",
        customerId: "cus_consumer",
        sellerId: seller,
        notes: "",
        paymentMode: "immediate",
        paymentMethod: "PIX",
        items: [{ productId: state.products[0].id, quantity: 1, price: 25 }],
      },
    });
    state = sale.state;
    state = apply(state, { type: "session.switchRole", roleId: "role_admin" }).state;
    state = apply(state, { type: "sale.cancel", saleId: sale.id, reason: "Agora permitido" }).state;
    expect(state.sales.find((item) => item.id === sale.id)!.status).toBe("cancelled");
  });

  it("stock adjustment uses chosen quantity", () => {
    let state = createSeedState(clock);
    const target = product(state, "AG-00124");
    reject(state, {
      type: "stock.adjust",
      productId: target.id,
      newQuantity: -1,
      reason: "Quantidade negativa",
    });
    reject(state, { type: "stock.adjust", productId: target.id, newQuantity: 20, reason: "" });
    state = apply(state, {
      type: "stock.adjust",
      productId: target.id,
      newQuantity: 20,
      reason: "Contagem física",
    }).state;
    expect(product(state, "AG-00124").stock).toBe(20);
    expect(movementsOf(state, target.id).at(-1)).toMatchObject({
      type: "adjustment",
      quantity: -4,
      balanceAfter: 20,
    });
  });
});
