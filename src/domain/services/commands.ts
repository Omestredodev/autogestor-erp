import type { CompanySettings, CustomerType, ID, PaymentMethod, Permission } from "../types";

export interface ProductInput {
  code: string;
  manufacturerCode: string;
  ean: string;
  oemCode: string;
  name: string;
  brandId: ID;
  categoryId: ID;
  unit: string;
  cost: number;
  /** Decimal margin (0.4 = 40%). */
  margin: number;
  initialStock: number;
  min: number;
  max: number;
  location: string;
  notes: string;
  /** On edit: apply the newly calculated reference price. Always true on create. */
  applyPrice: boolean;
}

export interface PurchaseInput {
  supplierId: ID;
  documentNumber: string;
  date: string;
  notes: string;
  updateCost: boolean;
  items: { productId: ID; quantity: number; unitCost: number }[];
}

export interface SaleInput {
  requestId: string;
  customerId: ID;
  sellerId: ID;
  notes: string;
  paymentMode: "immediate" | "deferred";
  paymentMethod?: PaymentMethod;
  dueDate?: string;
  items: { productId: ID; quantity: number; price: number }[];
}

export interface CustomerInput {
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  type: CustomerType;
  paymentTerms: string;
  creditLimit: number;
  notes: string;
}

export interface SupplierInput {
  name: string;
  document: string;
  phone: string;
  email: string;
  city: string;
  contact: string;
  paymentTerms: string;
}

export interface ReminderInput {
  title: string;
  description: string;
  dueAt: string;
  ownerId: ID;
  sharing: "private" | "team";
  customerId?: ID;
  productId?: ID;
  saleId?: ID;
}

export interface UserInput {
  name: string;
  email: string;
  roleId: ID;
}

export type PaymentTarget = { saleId: ID } | { closingId: ID };

export type Command =
  | { type: "product.save"; id?: ID; input: ProductInput }
  | { type: "product.toggleActive"; id: ID }
  | { type: "purchase.save"; id?: ID; input: PurchaseInput; confirm: boolean }
  | { type: "purchase.confirm"; id: ID }
  | { type: "purchase.discard"; id: ID }
  | { type: "stock.adjust"; productId: ID; newQuantity: number; reason: string }
  | { type: "sale.create"; input: SaleInput }
  | { type: "sale.cancel"; saleId: ID; reason: string }
  | {
      type: "sale.return";
      saleId: ID;
      reason: string;
      items: { saleItemId: ID; quantity: number }[];
    }
  | {
      type: "payment.register";
      target: PaymentTarget;
      amount: number;
      method: PaymentMethod;
      notes: string;
    }
  | {
      type: "payment.refund";
      target: PaymentTarget;
      amount: number;
      method: PaymentMethod;
      notes: string;
    }
  | { type: "customer.save"; id?: ID; input: CustomerInput }
  | { type: "customer.toggleActive"; id: ID }
  | { type: "supplier.save"; id?: ID; input: SupplierInput }
  | { type: "supplier.toggleActive"; id: ID }
  | { type: "closing.create"; customerId: ID; saleIds: ID[]; dueDate: string; notes: string }
  | { type: "application.create"; productId: ID; vehicleId: ID; notes: string }
  | { type: "application.remove"; id: ID }
  | { type: "equivalence.create"; productAId: ID; productBId: ID; notes: string }
  | { type: "equivalence.remove"; id: ID }
  | { type: "reminder.save"; id?: ID; input: ReminderInput }
  | { type: "reminder.setStatus"; id: ID; status: "done" | "cancelled" }
  | { type: "reminder.postpone"; id: ID; minutes: number }
  | { type: "user.save"; id?: ID; input: UserInput }
  | { type: "user.toggleActive"; id: ID }
  | { type: "role.update"; roleId: ID; permissions: Permission[] }
  | { type: "session.switchRole"; roleId: ID }
  | { type: "settings.save"; settings: CompanySettings };

export type CommandResult =
  | { ok: true; message: string; entityId?: ID }
  | { ok: false; error: string };
