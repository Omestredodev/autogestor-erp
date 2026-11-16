import type { Customer, Supplier } from "../types";
import type { CustomerInput, SupplierInput } from "./commands";
import { ensure, finish, newId, record, requirePermission, requireText, type Ctx } from "./core";
import { onlyDigits } from "../../utils/calculations";
import { money } from "../../utils/currency";

const validEmail = (email: string) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function saveCustomer(ctx: Ctx, id: string | undefined, input: CustomerInput) {
  requirePermission(ctx, "customers.manage");
  const name = requireText(input.name, "Informe o nome ou razão social.");
  const document = requireText(input.document, "Informe o CPF ou CNPJ.");
  const digits = onlyDigits(document);
  ensure(
    digits.length === 11 || digits.length === 14,
    "CPF deve ter 11 dígitos e CNPJ 14 dígitos.",
  );
  ensure(validEmail(input.email.trim()), "Informe um e-mail válido.");
  ensure(
    Number.isFinite(input.creditLimit) && input.creditLimit >= 0,
    "O limite de crédito não pode ser negativo.",
  );
  ensure(
    !ctx.state.customers.some(
      (customer) => customer.id !== id && onlyDigits(customer.document) === digits,
    ),
    "Já existe um cliente com este CPF/CNPJ.",
  );
  const data = {
    name,
    document,
    phone: input.phone.trim(),
    email: input.email.trim(),
    address: input.address.trim(),
    type: input.type,
    paymentTerms: input.paymentTerms,
    creditLimit: input.creditLimit,
    notes: input.notes.trim(),
  };
  if (!id) {
    const customer: Customer = {
      ...data,
      id: newId(ctx, "cus"),
      active: true,
      generic: false,
      createdAt: ctx.now,
    };
    record(ctx, {
      operation: "Cliente cadastrado",
      entityType: "Cliente",
      entityId: customer.id,
      entityLabel: name,
      description: `${name} · ${document}`,
      after: `${input.type} · ${input.paymentTerms} · Limite ${money(input.creditLimit)}`,
      relatedIds: [customer.id],
    });
    return {
      state: finish(ctx, { customers: [...ctx.state.customers, customer] }),
      message: `Cliente ${name} cadastrado.`,
      entityId: customer.id,
    };
  }
  const current = ctx.state.customers.find((customer) => customer.id === id);
  ensure(current, "Cliente não encontrado.");
  ensure(
    !current.generic,
    "O cliente AO CONSUMIDOR é uma identificação genérica e não pode ser editado.",
  );
  record(ctx, {
    operation: "Cliente editado",
    entityType: "Cliente",
    entityId: id,
    entityLabel: name,
    description: name,
    before: `${current.name} · ${current.paymentTerms} · Limite ${money(current.creditLimit)}`,
    after: `${name} · ${input.paymentTerms} · Limite ${money(input.creditLimit)}`,
    relatedIds: [id],
  });
  return {
    state: finish(ctx, {
      customers: ctx.state.customers.map((customer) =>
        customer.id === id ? { ...customer, ...data } : customer,
      ),
    }),
    message: `Cliente ${name} atualizado.`,
    entityId: id,
  };
}

export function toggleCustomer(ctx: Ctx, id: string) {
  requirePermission(ctx, "customers.manage");
  const customer = ctx.state.customers.find((item) => item.id === id);
  ensure(customer, "Cliente não encontrado.");
  ensure(!customer.generic, "AO CONSUMIDOR não pode ser inativado.");
  record(ctx, {
    operation: customer.active ? "Cliente inativado" : "Cliente reativado",
    entityType: "Cliente",
    entityId: id,
    entityLabel: customer.name,
    description: customer.name,
    before: customer.active ? "Ativo" : "Inativo",
    after: customer.active ? "Inativo" : "Ativo",
    relatedIds: [id],
  });
  return {
    state: finish(ctx, {
      customers: ctx.state.customers.map((item) =>
        item.id === id ? { ...item, active: !item.active } : item,
      ),
    }),
    message: customer.active
      ? `Cliente ${customer.name} inativado. Histórico preservado.`
      : `Cliente ${customer.name} reativado.`,
    entityId: id,
  };
}

export function saveSupplier(ctx: Ctx, id: string | undefined, input: SupplierInput) {
  requirePermission(ctx, "suppliers.manage");
  const name = requireText(input.name, "Informe a razão social do fornecedor.");
  const document = requireText(input.document, "Informe o CNPJ do fornecedor.");
  ensure(onlyDigits(document).length === 14, "O CNPJ deve conter 14 dígitos.");
  ensure(validEmail(input.email.trim()), "Informe um e-mail válido.");
  ensure(
    !ctx.state.suppliers.some(
      (supplier) => supplier.id !== id && onlyDigits(supplier.document) === onlyDigits(document),
    ),
    "Já existe um fornecedor com este CNPJ.",
  );
  const data = {
    name,
    document,
    phone: input.phone.trim(),
    email: input.email.trim(),
    city: input.city.trim(),
    contact: input.contact.trim(),
    paymentTerms: input.paymentTerms,
  };
  if (!id) {
    const supplier: Supplier = { ...data, id: newId(ctx, "sup"), active: true, createdAt: ctx.now };
    record(ctx, {
      operation: "Fornecedor cadastrado",
      entityType: "Fornecedor",
      entityId: supplier.id,
      entityLabel: name,
      description: `${name} · ${document}`,
      after: input.paymentTerms,
      relatedIds: [supplier.id],
    });
    return {
      state: finish(ctx, { suppliers: [...ctx.state.suppliers, supplier] }),
      message: `Fornecedor ${name} cadastrado.`,
      entityId: supplier.id,
    };
  }
  const current = ctx.state.suppliers.find((supplier) => supplier.id === id);
  ensure(current, "Fornecedor não encontrado.");
  record(ctx, {
    operation: "Fornecedor editado",
    entityType: "Fornecedor",
    entityId: id,
    entityLabel: name,
    description: name,
    before: `${current.name} · ${current.paymentTerms}`,
    after: `${name} · ${input.paymentTerms}`,
    relatedIds: [id],
  });
  return {
    state: finish(ctx, {
      suppliers: ctx.state.suppliers.map((supplier) =>
        supplier.id === id ? { ...supplier, ...data } : supplier,
      ),
    }),
    message: `Fornecedor ${name} atualizado.`,
    entityId: id,
  };
}

export function toggleSupplier(ctx: Ctx, id: string) {
  requirePermission(ctx, "suppliers.manage");
  const supplier = ctx.state.suppliers.find((item) => item.id === id);
  ensure(supplier, "Fornecedor não encontrado.");
  record(ctx, {
    operation: supplier.active ? "Fornecedor inativado" : "Fornecedor reativado",
    entityType: "Fornecedor",
    entityId: id,
    entityLabel: supplier.name,
    description: supplier.name,
    before: supplier.active ? "Ativo" : "Inativo",
    after: supplier.active ? "Inativo" : "Ativo",
    relatedIds: [id],
  });
  return {
    state: finish(ctx, {
      suppliers: ctx.state.suppliers.map((item) =>
        item.id === id ? { ...item, active: !item.active } : item,
      ),
    }),
    message: supplier.active
      ? `Fornecedor ${supplier.name} inativado. Compras preservadas.`
      : `Fornecedor ${supplier.name} reativado.`,
    entityId: id,
  };
}
