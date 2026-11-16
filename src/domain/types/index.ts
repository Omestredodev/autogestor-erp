import type { Permission } from "../rules/permissions";

export type { Permission };
export type ID = string;

export interface Brand {
  id: ID;
  name: string;
}

export interface Category {
  id: ID;
  name: string;
}

export interface Product {
  id: ID;
  code: string;
  manufacturerCode: string;
  ean: string;
  oemCode: string;
  name: string;
  brandId: ID;
  categoryId: ID;
  unit: string;
  /** Current cost. Updating it never changes `price` automatically. */
  cost: number;
  /** Manual margin as decimal (0.4 = 40%). */
  margin: number;
  /** Saved reference price. */
  price: number;
  /** Balance kept in sync with stock movements in the same state transition. */
  stock: number;
  min: number;
  max: number;
  location: string;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: ID;
  maker: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  engine: string;
  version: string;
  features: string;
}

export interface VehicleApplication {
  id: ID;
  productId: ID;
  vehicleId: ID;
  notes: string;
  active: boolean;
  createdAt: string;
  createdBy: ID;
  removedAt?: string;
  removedBy?: ID;
}

export interface Equivalence {
  id: ID;
  productAId: ID;
  productBId: ID;
  notes: string;
  active: boolean;
  createdAt: string;
  createdBy: ID;
  removedAt?: string;
  removedBy?: ID;
}

export type CustomerType = "Pessoa física" | "Oficina" | "Frota" | "Revenda" | "Genérico";

export interface Customer {
  id: ID;
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  type: CustomerType;
  paymentTerms: string;
  creditLimit: number;
  notes: string;
  active: boolean;
  /** "AO CONSUMIDOR": generic commercial identification. */
  generic: boolean;
  createdAt: string;
}

export interface Supplier {
  id: ID;
  name: string;
  document: string;
  phone: string;
  email: string;
  city: string;
  contact: string;
  paymentTerms: string;
  active: boolean;
  createdAt: string;
}

export interface PurchaseItem {
  id: ID;
  productId: ID;
  quantity: number;
  unitCost: number;
}

export type PurchaseStatus = "draft" | "confirmed" | "discarded";

export interface Purchase {
  id: ID;
  number: string;
  supplierId: ID;
  documentNumber: string;
  date: string;
  status: PurchaseStatus;
  items: PurchaseItem[];
  notes: string;
  updateCost: boolean;
  createdAt: string;
  createdBy: ID;
  confirmedAt?: string;
  confirmedBy?: ID;
}

export type StockMovementType =
  | "initial"
  | "purchase"
  | "sale"
  | "return"
  | "cancellation"
  | "adjustment";

export type ReferenceType = "product" | "purchase" | "sale" | "return" | "adjustment";

export interface StockMovement {
  id: ID;
  productId: ID;
  type: StockMovementType;
  /** Signed quantity: positive for entries, negative for exits. */
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  refType: ReferenceType;
  refId: ID;
  reason: string;
  at: string;
  userId: ID;
}

export type PaymentMethod =
  | "PIX"
  | "Dinheiro"
  | "Cartão de débito"
  | "Cartão de crédito"
  | "Boleto"
  | "Transferência"
  | "Crédito do cliente";

export interface SaleItem {
  id: ID;
  productId: ID;
  /** Historical snapshot at sale time. */
  code: string;
  manufacturerCode: string;
  name: string;
  quantity: number;
  unitCost: number;
  referencePrice: number;
  /** Practiced unit price. */
  price: number;
}

export type SaleStatus = "valid" | "cancelled";

export interface Sale {
  id: ID;
  number: string;
  requestId: string;
  customerId: ID;
  customerName: string;
  sellerId: ID;
  sellerName: string;
  at: string;
  notes: string;
  paymentMode: "immediate" | "deferred";
  paymentMethod?: PaymentMethod;
  dueDate?: string;
  items: SaleItem[];
  status: SaleStatus;
  closingId?: ID;
  cancelledAt?: string;
  cancelledBy?: ID;
  cancelReason?: string;
}

export interface ReturnItem {
  saleItemId: ID;
  productId: ID;
  quantity: number;
  unitPrice: number;
}

export interface SaleReturn {
  id: ID;
  number: string;
  saleId: ID;
  at: string;
  userId: ID;
  reason: string;
  items: ReturnItem[];
}

export interface Payment {
  id: ID;
  number: string;
  /** receipt = money received; refund = executed reimbursement. */
  kind: "receipt" | "refund";
  amount: number;
  method: PaymentMethod;
  at: string;
  userId: ID;
  customerId: ID;
  saleId?: ID;
  closingId?: ID;
  notes: string;
}

/** Receivable title. Amounts are derived from sales, returns and payments. */
export interface Receivable {
  id: ID;
  number: string;
  origin: "sale" | "closing";
  saleId?: ID;
  closingId?: ID;
  customerId: ID;
  dueDate: string;
  createdAt: string;
  /** When a sale receivable is consolidated into a closing. */
  supersededByClosingId?: ID;
}

export interface Closing {
  id: ID;
  number: string;
  customerId: ID;
  saleIds: ID[];
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  notes: string;
  createdAt: string;
  createdBy: ID;
}

export type ReminderStatus = "pending" | "done" | "cancelled";

export interface ReminderHistory {
  at: string;
  userId: ID;
  action: string;
}

export interface Reminder {
  id: ID;
  title: string;
  description: string;
  dueAt: string;
  /** Next notification moment; moves forward when postponed. */
  notifyAt: string;
  ownerId: ID;
  sharing: "private" | "team";
  customerId?: ID;
  productId?: ID;
  saleId?: ID;
  status: ReminderStatus;
  history: ReminderHistory[];
  createdAt: string;
}

export interface Role {
  id: ID;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface User {
  id: ID;
  name: string;
  initials: string;
  email: string;
  roleId: ID;
  active: boolean;
  createdAt: string;
}

export type EntityType =
  | "Produto"
  | "Aplicação"
  | "Equivalência"
  | "Cliente"
  | "Fornecedor"
  | "Compra"
  | "Estoque"
  | "Venda"
  | "Devolução"
  | "Pagamento"
  | "Fechamento"
  | "Lembrete"
  | "Usuário"
  | "Perfil"
  | "Sessão"
  | "Configuração";

export interface AuditEvent {
  id: ID;
  at: string;
  userId: ID;
  userName: string;
  operation: string;
  entityType: EntityType;
  entityId: ID;
  entityLabel: string;
  description: string;
  before?: string;
  after?: string;
  relatedIds?: ID[];
}

export interface CompanySettings {
  companyName: string;
  tradeName: string;
  document: string;
  phone: string;
  email: string;
  city: string;
  allowBelowReference: boolean;
  lowStockAlerts: boolean;
  allowGenericCustomer: boolean;
}

export interface AppState {
  version: number;
  brands: Brand[];
  categories: Category[];
  products: Product[];
  vehicles: Vehicle[];
  applications: VehicleApplication[];
  equivalences: Equivalence[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  movements: StockMovement[];
  sales: Sale[];
  returns: SaleReturn[];
  payments: Payment[];
  receivables: Receivable[];
  closings: Closing[];
  reminders: Reminder[];
  users: User[];
  roles: Role[];
  audit: AuditEvent[];
  settings: CompanySettings;
  session: { userId: ID };
  seq: Record<string, number>;
}
