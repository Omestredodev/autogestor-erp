import {
  Boxes,
  Building2,
  CalendarClock,
  Car,
  ClipboardCheck,
  FileBarChart,
  LayoutDashboard,
  Package,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "../../domain/types";
import type { PaymentTarget } from "../../store/actions";

export type Page =
  | "dashboard"
  | "products"
  | "applications"
  | "equivalents"
  | "clients"
  | "suppliers"
  | "purchases"
  | "inventory"
  | "sales"
  | "closings"
  | "finance"
  | "reminders"
  | "reports"
  | "admin"
  | "audit"
  | "settings";

export interface Route {
  page: Page;
  /** Record ID for detail screens. */
  id?: string;
  tab?: string;
  /** Optional initial filters (e.g. audit search, inventory product). */
  params?: Record<string, string>;
}

export interface NavItem {
  id: Page;
  label: string;
  icon: LucideIcon;
  /** Any of these permissions grants access. Empty = always available. */
  permissions: Permission[];
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, permissions: ["dashboard.view"] },
  { id: "products", label: "Produtos", icon: Package, permissions: ["products.view"] },
  {
    id: "applications",
    label: "Aplicações Automotivas",
    icon: Car,
    permissions: ["products.view"],
  },
  { id: "equivalents", label: "Equivalências", icon: RefreshCw, permissions: ["products.view"] },
  { id: "clients", label: "Clientes", icon: Users, permissions: ["customers.view"] },
  {
    id: "suppliers",
    label: "Fornecedores",
    icon: Building2,
    permissions: ["suppliers.manage", "purchases.manage"],
  },
  { id: "purchases", label: "Compras", icon: Truck, permissions: ["purchases.manage"] },
  { id: "inventory", label: "Estoque", icon: Boxes, permissions: ["inventory.view"] },
  { id: "sales", label: "Vendas", icon: ShoppingCart, permissions: ["sales.view", "sales.create"] },
  {
    id: "closings",
    label: "Fechamentos",
    icon: ClipboardCheck,
    permissions: ["closings.manage", "finance.view"],
  },
  { id: "finance", label: "Financeiro", icon: WalletCards, permissions: ["finance.view"] },
  { id: "reminders", label: "Lembretes", icon: CalendarClock, permissions: ["reminders.manage"] },
  { id: "reports", label: "Relatórios", icon: FileBarChart, permissions: ["reports.view"] },
  { id: "admin", label: "Administração", icon: UserCog, permissions: ["users.manage"] },
  { id: "audit", label: "Auditoria", icon: ShieldCheck, permissions: ["audit.view"] },
  { id: "settings", label: "Configurações", icon: Settings, permissions: [] },
];

export const pageLabel = (page: Page) =>
  NAV_ITEMS.find((item) => item.id === page)?.label ?? "AutoGestor";

export const canAccessPage = (page: Page, can: (permission: Permission) => boolean) => {
  const item = NAV_ITEMS.find((nav) => nav.id === page);
  return !item || item.permissions.length === 0 || item.permissions.some(can);
};

export type Overlay =
  | { type: "pos"; customerId?: string }
  | { type: "product-form"; productId?: string }
  | { type: "purchase-form"; purchaseId?: string; supplierId?: string; productId?: string }
  | { type: "customer-form"; customerId?: string }
  | { type: "supplier-form"; supplierId?: string }
  | {
      type: "reminder-form";
      reminderId?: string;
      customerId?: string;
      productId?: string;
      saleId?: string;
    }
  | { type: "stock-adjust"; productId: string }
  | { type: "receipt"; saleId: string }
  | { type: "payment"; target: PaymentTarget; mode: "receipt" | "refund" }
  | { type: "application-form"; productId?: string; vehicleId?: string }
  | { type: "sale-return"; saleId: string }
  | { type: "sale-cancel"; saleId: string }
  | { type: "reset-demo" };
