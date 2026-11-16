import type { AppState, Product } from "../types";
import type { ProductInput } from "./commands";
import {
  applyStockChange,
  ensure,
  finish,
  newId,
  record,
  requirePermission,
  requireText,
  type Ctx,
} from "./core";
import { referencePrice } from "../../utils/calculations";
import { money, percent } from "../../utils/currency";

export function saveProduct(ctx: Ctx, id: string | undefined, input: ProductInput) {
  requirePermission(ctx, "products.manage");
  const state = ctx.state;
  const code = requireText(input.code, "Informe o código interno.").toUpperCase();
  const manufacturerCode = requireText(input.manufacturerCode, "Informe o código do fabricante.");
  const name = requireText(input.name, "Informe a descrição do produto.");
  ensure(
    state.brands.some((brand) => brand.id === input.brandId),
    "Selecione uma marca válida.",
  );
  ensure(
    state.categories.some((category) => category.id === input.categoryId),
    "Selecione uma categoria válida.",
  );
  ensure(Number.isFinite(input.cost) && input.cost >= 0, "O custo não pode ser negativo.");
  ensure(
    Number.isFinite(input.margin) && input.margin >= 0 && input.margin < 1,
    "A margem deve ser maior ou igual a 0% e menor que 100%.",
  );
  ensure(Number.isInteger(input.min) && input.min >= 0, "Estoque mínimo inválido.");
  ensure(
    Number.isInteger(input.max) && input.max >= input.min,
    "O estoque máximo deve ser maior ou igual ao mínimo.",
  );
  const others = state.products.filter((product) => product.id !== id);
  ensure(
    !others.some((product) => product.code.toUpperCase() === code),
    `O código interno ${code} já está em uso.`,
  );
  ensure(
    !others.some(
      (product) =>
        product.brandId === input.brandId &&
        product.manufacturerCode.toUpperCase() === manufacturerCode.toUpperCase(),
    ),
    "Já existe um produto desta marca com o mesmo código do fabricante.",
  );
  const ean = input.ean.trim();
  if (ean) {
    ensure(/^\d{8,14}$/.test(ean), "O EAN deve conter entre 8 e 14 dígitos.");
    ensure(
      !others.some((product) => product.ean === ean),
      "Este EAN já está associado a outro produto.",
    );
  }
  const calculated = referencePrice(input.cost, input.margin);
  const base = {
    code,
    manufacturerCode,
    ean,
    oemCode: input.oemCode.trim(),
    name,
    brandId: input.brandId,
    categoryId: input.categoryId,
    unit: input.unit || "UN",
    cost: input.cost,
    margin: input.margin,
    min: input.min,
    max: input.max,
    location: input.location.trim(),
    notes: input.notes.trim(),
  };

  if (!id) {
    ensure(
      Number.isInteger(input.initialStock) && input.initialStock >= 0,
      "Estoque inicial inválido.",
    );
    const product: Product = {
      ...base,
      id: newId(ctx, "prd"),
      price: calculated,
      stock: 0,
      active: true,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    };
    const products = [...state.products, product];
    const movements = [...state.movements];
    if (input.initialStock > 0) {
      applyStockChange(ctx, products, movements, {
        productId: product.id,
        quantity: input.initialStock,
        type: "initial",
        refType: "product",
        refId: product.id,
        reason: "Saldo inicial do cadastro",
      });
    }
    record(ctx, {
      operation: "Produto cadastrado",
      entityType: "Produto",
      entityId: product.id,
      entityLabel: code,
      description: `${code} — ${name}`,
      after: `Custo ${money(input.cost)} · Margem ${percent(input.margin)} · Preço ${money(calculated)} · Estoque ${input.initialStock}`,
      relatedIds: [product.id],
    });
    return {
      state: finish(ctx, { products, movements }),
      message: `Produto ${code} cadastrado.`,
      entityId: product.id,
    };
  }

  const current = state.products.find((product) => product.id === id);
  ensure(current, "Produto não encontrado.");
  const updated: Product = {
    ...current,
    ...base,
    price: input.applyPrice ? calculated : current.price,
    updatedAt: ctx.now,
  };
  const changes: string[] = [];
  const before: string[] = [];
  const compare = (label: string, a: string, b: string) => {
    if (a !== b) {
      before.push(`${label}: ${a || "—"}`);
      changes.push(`${label}: ${b || "—"}`);
    }
  };
  compare("Código", current.code, updated.code);
  compare("Descrição", current.name, updated.name);
  compare("Cód. fabricante", current.manufacturerCode, updated.manufacturerCode);
  compare("EAN", current.ean, updated.ean);
  compare("Custo", money(current.cost), money(updated.cost));
  compare("Margem", percent(current.margin), percent(updated.margin));
  compare("Preço", money(current.price), money(updated.price));
  compare("Mín./Máx.", `${current.min}/${current.max}`, `${updated.min}/${updated.max}`);
  compare("Localização", current.location, updated.location);
  if (current.brandId !== updated.brandId) compare("Marca", current.brandId, updated.brandId);
  if (current.categoryId !== updated.categoryId)
    compare("Categoria", current.categoryId, updated.categoryId);
  record(ctx, {
    operation: "Produto editado",
    entityType: "Produto",
    entityId: id,
    entityLabel: updated.code,
    description: `${updated.code} — ${updated.name}`,
    before: before.join(" · ") || "Sem alterações",
    after: changes.join(" · ") || "Sem alterações",
    relatedIds: [id],
  });
  return {
    state: finish(ctx, {
      products: state.products.map((product) => (product.id === id ? updated : product)),
    }),
    message: `Produto ${updated.code} atualizado.`,
    entityId: id,
  };
}

export function toggleProduct(ctx: Ctx, id: string) {
  requirePermission(ctx, "products.manage");
  const product = ctx.state.products.find((item) => item.id === id);
  ensure(product, "Produto não encontrado.");
  const active = !product.active;
  record(ctx, {
    operation: active ? "Produto reativado" : "Produto inativado",
    entityType: "Produto",
    entityId: id,
    entityLabel: product.code,
    description: `${product.code} — ${product.name}`,
    before: product.active ? "Ativo" : "Inativo",
    after: active ? "Ativo" : "Inativo",
    relatedIds: [id],
  });
  return {
    state: finish(ctx, {
      products: ctx.state.products.map((item) =>
        item.id === id ? { ...item, active, updatedAt: ctx.now } : item,
      ),
    }),
    message: active
      ? `Produto ${product.code} reativado.`
      : `Produto ${product.code} inativado. O histórico foi preservado.`,
    entityId: id,
  };
}

const vehicleLabel = (state: AppState, vehicleId: string) => {
  const vehicle = state.vehicles.find((item) => item.id === vehicleId);
  return vehicle
    ? `${vehicle.maker} ${vehicle.model} ${vehicle.yearFrom}–${vehicle.yearTo} ${vehicle.engine} ${vehicle.version}`
    : vehicleId;
};

export function createApplication(ctx: Ctx, productId: string, vehicleId: string, notes: string) {
  requirePermission(ctx, "vehicles.manage");
  const product = ctx.state.products.find((item) => item.id === productId);
  ensure(product, "Selecione um produto válido.");
  ensure(
    ctx.state.vehicles.some((item) => item.id === vehicleId),
    "Selecione um veículo válido.",
  );
  ensure(
    !ctx.state.applications.some(
      (item) => item.active && item.productId === productId && item.vehicleId === vehicleId,
    ),
    "Esta aplicação já está associada ao produto.",
  );
  const id = newId(ctx, "app");
  record(ctx, {
    operation: "Aplicação associada",
    entityType: "Aplicação",
    entityId: id,
    entityLabel: product.code,
    description: `${product.code} → ${vehicleLabel(ctx.state, vehicleId)} (demonstrativo)`,
    after: "Ativa",
    relatedIds: [productId],
  });
  return {
    state: finish(ctx, {
      applications: [
        ...ctx.state.applications,
        {
          id,
          productId,
          vehicleId,
          notes: notes.trim(),
          active: true,
          createdAt: ctx.now,
          createdBy: ctx.user.id,
        },
      ],
    }),
    message: "Aplicação associada ao produto.",
    entityId: id,
  };
}

export function removeApplication(ctx: Ctx, id: string) {
  requirePermission(ctx, "vehicles.manage");
  const application = ctx.state.applications.find((item) => item.id === id);
  ensure(application?.active, "Aplicação não encontrada ou já removida.");
  const product = ctx.state.products.find((item) => item.id === application.productId);
  record(ctx, {
    operation: "Aplicação removida",
    entityType: "Aplicação",
    entityId: id,
    entityLabel: product?.code ?? application.productId,
    description: `${product?.code ?? ""} → ${vehicleLabel(ctx.state, application.vehicleId)}`,
    before: "Ativa",
    after: "Inativa",
    relatedIds: [application.productId],
  });
  return {
    state: finish(ctx, {
      applications: ctx.state.applications.map((item) =>
        item.id === id
          ? { ...item, active: false, removedAt: ctx.now, removedBy: ctx.user.id }
          : item,
      ),
    }),
    message: "Aplicação removida. O registro permanece na auditoria.",
  };
}

export function createEquivalence(ctx: Ctx, productAId: string, productBId: string, notes: string) {
  requirePermission(ctx, "equivalents.manage");
  ensure(productAId !== productBId, "Um produto não pode ser equivalente a ele mesmo.");
  const a = ctx.state.products.find((item) => item.id === productAId);
  const b = ctx.state.products.find((item) => item.id === productBId);
  ensure(a && b, "Selecione dois produtos cadastrados.");
  ensure(
    !ctx.state.equivalences.some(
      (item) =>
        item.active &&
        ((item.productAId === productAId && item.productBId === productBId) ||
          (item.productAId === productBId && item.productBId === productAId)),
    ),
    "Esta equivalência já existe.",
  );
  const id = newId(ctx, "eqv");
  record(ctx, {
    operation: "Equivalência adicionada",
    entityType: "Equivalência",
    entityId: id,
    entityLabel: `${a.code} ↔ ${b.code}`,
    description: `${a.name} ↔ ${b.name}`,
    after: "Ativa",
    relatedIds: [a.id, b.id],
  });
  return {
    state: finish(ctx, {
      equivalences: [
        ...ctx.state.equivalences,
        {
          id,
          productAId,
          productBId,
          notes: notes.trim(),
          active: true,
          createdAt: ctx.now,
          createdBy: ctx.user.id,
        },
      ],
    }),
    message: `Equivalência ${a.code} ↔ ${b.code} adicionada.`,
    entityId: id,
  };
}

export function removeEquivalence(ctx: Ctx, id: string) {
  requirePermission(ctx, "equivalents.manage");
  const relation = ctx.state.equivalences.find((item) => item.id === id);
  ensure(relation?.active, "Equivalência não encontrada ou já removida.");
  const a = ctx.state.products.find((item) => item.id === relation.productAId);
  const b = ctx.state.products.find((item) => item.id === relation.productBId);
  record(ctx, {
    operation: "Equivalência removida",
    entityType: "Equivalência",
    entityId: id,
    entityLabel: `${a?.code} ↔ ${b?.code}`,
    description: `${a?.name} ↔ ${b?.name}`,
    before: "Ativa",
    after: "Inativa",
    relatedIds: [relation.productAId, relation.productBId],
  });
  return {
    state: finish(ctx, {
      equivalences: ctx.state.equivalences.map((item) =>
        item.id === id
          ? { ...item, active: false, removedAt: ctx.now, removedBy: ctx.user.id }
          : item,
      ),
    }),
    message: "Equivalência removida. A rastreabilidade foi mantida.",
  };
}
