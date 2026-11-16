export const PERMISSIONS = [
  { id: "dashboard.view", label: "Visualizar dashboard", group: "Geral" },
  {
    id: "products.view",
    label: "Consultar produtos, aplicações e equivalências",
    group: "Catálogo",
  },
  { id: "products.manage", label: "Cadastrar, editar e inativar produtos", group: "Catálogo" },
  { id: "vehicles.manage", label: "Gerenciar aplicações automotivas", group: "Catálogo" },
  { id: "equivalents.manage", label: "Gerenciar equivalências", group: "Catálogo" },
  { id: "customers.view", label: "Consultar clientes", group: "Cadastros" },
  { id: "customers.manage", label: "Cadastrar, editar e inativar clientes", group: "Cadastros" },
  { id: "suppliers.manage", label: "Gerenciar fornecedores", group: "Cadastros" },
  { id: "purchases.manage", label: "Registrar e confirmar compras", group: "Estoque" },
  { id: "inventory.view", label: "Consultar estoque e movimentações", group: "Estoque" },
  { id: "inventory.adjust", label: "Ajustar estoque", group: "Estoque" },
  { id: "sales.view", label: "Consultar vendas", group: "Vendas" },
  { id: "sales.create", label: "Realizar vendas", group: "Vendas" },
  { id: "sales.priceOverride", label: "Alterar preço praticado na venda", group: "Vendas" },
  { id: "sales.return", label: "Registrar devoluções", group: "Vendas" },
  { id: "sales.cancel", label: "Cancelar vendas", group: "Vendas" },
  { id: "finance.view", label: "Consultar financeiro", group: "Financeiro" },
  { id: "finance.manage", label: "Registrar pagamentos e reembolsos", group: "Financeiro" },
  { id: "closings.manage", label: "Gerar fechamentos", group: "Financeiro" },
  { id: "reminders.manage", label: "Gerenciar lembretes", group: "Produtividade" },
  { id: "reports.view", label: "Consultar relatórios", group: "Produtividade" },
  { id: "users.manage", label: "Gerenciar usuários e permissões", group: "Administração" },
  { id: "audit.view", label: "Consultar auditoria", group: "Administração" },
  { id: "settings.manage", label: "Alterar configurações", group: "Administração" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["id"];

export const ALL_PERMISSIONS: Permission[] = PERMISSIONS.map((permission) => permission.id);

export const permissionLabel = (permission: Permission) =>
  PERMISSIONS.find((item) => item.id === permission)?.label ?? permission;

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  role_admin: ALL_PERMISSIONS,
  role_seller: [
    "dashboard.view",
    "products.view",
    "equivalents.manage",
    "customers.view",
    "customers.manage",
    "inventory.view",
    "sales.view",
    "sales.create",
    "sales.priceOverride",
    "sales.return",
    "reminders.manage",
  ],
  role_stock: [
    "dashboard.view",
    "products.view",
    "products.manage",
    "vehicles.manage",
    "suppliers.manage",
    "purchases.manage",
    "inventory.view",
    "inventory.adjust",
    "reminders.manage",
    "reports.view",
  ],
  role_finance: [
    "dashboard.view",
    "customers.view",
    "customers.manage",
    "sales.view",
    "finance.view",
    "finance.manage",
    "closings.manage",
    "reminders.manage",
    "reports.view",
  ],
};

/** Lock-out protection: the administrator profile always keeps these. */
export const ADMIN_LOCKED_PERMISSIONS: Permission[] = ["users.manage", "audit.view"];
