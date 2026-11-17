import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Bell,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Car,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileSearch,
  Filter,
  Gauge,
  History,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sun,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type Page =
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

type Product = {
  code: string;
  name: string;
  maker: string;
  cost: number;
  margin: number;
  price: number;
  stock: number;
  min: number;
  max: number;
  location: string;
  category: string;
  manufacturerCode: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const initialProducts: Product[] = [
  {
    code: "AG-00124",
    name: "Filtro de óleo PSL55",
    maker: "Tecfil",
    cost: 18.5,
    margin: 0.42,
    price: 31.9,
    stock: 24,
    min: 8,
    max: 50,
    location: "A-03-02",
    category: "Filtros",
    manufacturerCode: "PSL55",
  },
  {
    code: "AG-00286",
    name: "Pastilha de freio dianteira",
    maker: "Cobreq",
    cost: 74.9,
    margin: 0.38,
    price: 120.81,
    stock: 5,
    min: 10,
    max: 30,
    location: "B-01-04",
    category: "Freios",
    manufacturerCode: "N-1837",
  },
  {
    code: "AG-00351",
    name: "Vela de ignição resistiva",
    maker: "NGK",
    cost: 22.4,
    margin: 0.4,
    price: 37.33,
    stock: 42,
    min: 12,
    max: 80,
    location: "C-02-01",
    category: "Ignição",
    manufacturerCode: "BKR6E",
  },
  {
    code: "AG-00407",
    name: "Amortecedor dianteiro",
    maker: "Cofap",
    cost: 189.5,
    margin: 0.35,
    price: 291.54,
    stock: 0,
    min: 4,
    max: 16,
    location: "D-04-03",
    category: "Suspensão",
    manufacturerCode: "GP33218",
  },
  {
    code: "AG-00582",
    name: "Correia dentada 111 dentes",
    maker: "Gates",
    cost: 67,
    margin: 0.37,
    price: 106.35,
    stock: 9,
    min: 6,
    max: 24,
    location: "A-07-02",
    category: "Motor",
    manufacturerCode: "CT111SP",
  },
  {
    code: "AG-00611",
    name: "Lâmpada H7 12V 55W",
    maker: "Osram",
    cost: 29.9,
    margin: 0.45,
    price: 54.36,
    stock: 31,
    min: 10,
    max: 60,
    location: "E-02-05",
    category: "Elétrica",
    manufacturerCode: "64210",
  },
];

const navItems: { id: Page; label: string; icon: typeof Gauge }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Produtos", icon: Package },
  { id: "applications", label: "Aplicações Automotivas", icon: Car },
  { id: "equivalents", label: "Equivalências", icon: RefreshCw },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "suppliers", label: "Fornecedores", icon: Building2 },
  { id: "purchases", label: "Compras", icon: Truck },
  { id: "inventory", label: "Estoque", icon: Boxes },
  { id: "sales", label: "Vendas", icon: ShoppingCart },
  { id: "closings", label: "Fechamentos", icon: ClipboardCheck },
  { id: "finance", label: "Financeiro", icon: WalletCards },
  { id: "reminders", label: "Lembretes", icon: CalendarClock },
  { id: "reports", label: "Relatórios", icon: FileBarChart },
  { id: "admin", label: "Administração", icon: UserCog },
  { id: "audit", label: "Auditoria", icon: ShieldCheck },
  { id: "settings", label: "Configurações", icon: Settings },
];

const sales = [
  {
    id: "#VD-2841",
    client: "Auto Center Avenida",
    seller: "Mariana Costa",
    date: "Hoje, 10:42",
    value: 642.8,
    status: "Concluída",
  },
  {
    id: "#VD-2840",
    client: "AO CONSUMIDOR",
    seller: "Rafael Lima",
    date: "Hoje, 09:58",
    value: 187.9,
    status: "Concluída",
  },
  {
    id: "#VD-2839",
    client: "Transportadora Horizonte",
    seller: "Mariana Costa",
    date: "Hoje, 09:21",
    value: 1248.5,
    status: "Em aberto",
  },
  {
    id: "#VD-2838",
    client: "Oficina São Lucas",
    seller: "Carlos Mendes",
    date: "Ontem, 17:46",
    value: 398.2,
    status: "Concluída",
  },
  {
    id: "#VD-2837",
    client: "Ricardo Nogueira",
    seller: "Rafael Lima",
    date: "Ontem, 16:33",
    value: 95.7,
    status: "Cancelada",
  },
];

const auditRows = [
  ["Hoje, 10:43", "Mariana Costa", "Venda concluída", "Venda", "#VD-2841", "—", "R$ 642,80"],
  ["Hoje, 09:59", "Rafael Lima", "Saída de estoque", "Produto", "AG-00351", "44 un.", "42 un."],
  [
    "Ontem, 17:48",
    "Carlos Mendes",
    "Preço praticado",
    "Venda",
    "#VD-2838",
    "R$ 120,81",
    "R$ 115,00",
  ],
  ["Ontem, 15:12", "Ana Martins", "Ajuste de estoque", "Produto", "AG-00286", "3 un.", "5 un."],
  ["21/05, 11:04", "Admin", "Relação adicionada", "Equivalência", "AG-00124", "—", "MANN W712/22"],
];

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [products, setProducts] = useState(initialProducts);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [profile, setProfile] = useState("Administrador");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const navigate = (next: Page) => {
    setPage(next);
    setMobileOpen(false);
    setSelectedProduct(null);
  };
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };
  const title = navItems.find((item) => item.id === page)?.label ?? "Dashboard";

  return (
    <div className={dark ? "app dark" : "app"}>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        page={page}
        navigate={navigate}
        onClose={() => setMobileOpen(false)}
      />
      <div className={collapsed ? "shell shell-collapsed" : "shell"}>
        <Topbar
          dark={dark}
          profile={profile}
          onMenu={() => setMobileOpen(true)}
          onTheme={() => setDark(!dark)}
          onProfile={setProfile}
          onReminder={() => setModal("reminder-popup")}
        />
        <main className="main">
          <div className="page-heading">
            <div>
              <div className="breadcrumb">
                AutoGestor <ChevronRight size={13} /> {title}
              </div>
              <h1>{selectedProduct ? selectedProduct.name : title}</h1>
              <p>
                {selectedProduct
                  ? `${selectedProduct.code} · ${selectedProduct.maker}`
                  : pageSubtitle[page]}
              </p>
            </div>
            <div className="heading-actions">
              {page === "products" && !selectedProduct && (
                <Button icon={Plus} onClick={() => setModal("new-product")}>
                  Novo produto
                </Button>
              )}
              {page === "inventory" && (
                <Button icon={SlidersHorizontal} onClick={() => setModal("stock-adjust")}>
                  Ajustar estoque
                </Button>
              )}
              {page === "sales" && (
                <Button icon={Plus} onClick={() => setModal("new-sale")}>
                  Nova venda
                </Button>
              )}
              <button
                className="icon-button collapse-button"
                onClick={() => setCollapsed(!collapsed)}
                title="Recolher menu"
              >
                {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
              </button>
            </div>
          </div>

          {selectedProduct ? (
            <ProductDetail
              product={selectedProduct}
              onBack={() => setSelectedProduct(null)}
              onEdit={() => setModal("new-product")}
              notify={notify}
            />
          ) : (
            <PageContent
              page={page}
              products={products}
              navigate={navigate}
              setModal={setModal}
              notify={notify}
              onProduct={setSelectedProduct}
              profile={profile}
            />
          )}
        </main>
      </div>
      {modal && (
        <ModalFlow
          type={modal}
          products={products}
          close={() => setModal(null)}
          notify={notify}
          setProducts={setProducts}
          navigate={navigate}
        />
      )}
      {toast && (
        <div className="toast">
          <span>
            <Check size={17} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

const pageSubtitle: Record<Page, string> = {
  dashboard: "Visão geral da operação em 22 de maio de 2025",
  products: "Catálogo, preços, aplicações e disponibilidade",
  applications: "Encontre peças compatíveis por veículo",
  equivalents: "Relações entre códigos e produtos correspondentes",
  clients: "Cadastro, histórico e situação comercial",
  suppliers: "Parceiros comerciais e condições de compra",
  purchases: "Entradas de mercadorias e atualização de custos",
  inventory: "Saldos, localização e movimentações de produtos",
  sales: "Frente de caixa e consulta avançada de vendas",
  closings: "Consolidação de vendas em aberto por cliente",
  finance: "Recebimentos, saldos e histórico financeiro",
  reminders: "Compromissos e tarefas da equipe",
  reports: "Indicadores comerciais e operacionais",
  admin: "Usuários, perfis e permissões",
  audit: "Rastreabilidade das ações realizadas no sistema",
  settings: "Preferências gerais da empresa e do sistema",
};

function Sidebar({
  collapsed,
  mobileOpen,
  page,
  navigate,
  onClose,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  page: Page;
  navigate: (p: Page) => void;
  onClose: () => void;
}) {
  return (
    <>
      {mobileOpen && <div className="overlay mobile-overlay" onClick={onClose} />}
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
      >
        <div className="brand">
          <div className="brand-mark">
            <Car size={23} strokeWidth={2.4} />
          </div>
          {!collapsed && (
            <div>
              <strong>AutoGestor</strong>
              <small>Gestão inteligente</small>
            </div>
          )}
          <button className="mobile-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              className={page === id ? "active" : ""}
              key={id}
              onClick={() => navigate(id)}
              title={collapsed ? label : ""}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "inventory" && !collapsed && <i>7</i>}
              {id === "reminders" && !collapsed && <i>3</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="company-avatar">AP</div>
          {!collapsed && (
            <div>
              <strong>Auto Peças Brasil</strong>
              <small>Unidade Centro</small>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Topbar({
  dark,
  profile,
  onMenu,
  onTheme,
  onProfile,
  onReminder,
}: {
  dark: boolean;
  profile: string;
  onMenu: () => void;
  onTheme: () => void;
  onProfile: (v: string) => void;
  onReminder: () => void;
}) {
  const [accountOpen, setAccountOpen] = useState(false);
  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" onClick={onMenu}>
        <Menu size={20} />
      </button>
      <label className="global-search">
        <Search size={18} />
        <input placeholder="Pesquisar produtos, vendas, clientes..." />
        <kbd>⌘ K</kbd>
      </label>
      <div className="top-actions">
        <button className="icon-button reminder-button" onClick={onReminder} title="Lembretes">
          <CalendarClock size={19} />
          <b>3</b>
        </button>
        <button className="icon-button" title="Notificações">
          <Bell size={19} />
          <span className="notification-dot" />
        </button>
        <button className="icon-button" onClick={onTheme} title="Alternar tema">
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <div className="profile-switch">
          <select value={profile} onChange={(e) => onProfile(e.target.value)} aria-label="Perfil">
            <option>Administrador</option>
            <option>Vendedor</option>
            <option>Estoque/Compras</option>
            <option>Financeiro</option>
          </select>
        </div>
        <button className="account" onClick={() => setAccountOpen(!accountOpen)}>
          <span>MC</span>
          <div>
            <strong>Mariana Costa</strong>
            <small>{profile}</small>
          </div>
          <ChevronDown size={15} />
        </button>
        {accountOpen && (
          <div className="account-menu">
            <button>
              <UserCog size={16} /> Minha conta
            </button>
            <button>
              <Settings size={16} /> Preferências
            </button>
            <hr />
            <button className="danger">
              <ArrowLeft size={16} /> Sair do sistema
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function PageContent({
  page,
  products,
  navigate,
  setModal,
  notify,
  onProduct,
  profile,
}: {
  page: Page;
  products: Product[];
  navigate: (p: Page) => void;
  setModal: (m: string) => void;
  notify: (m: string) => void;
  onProduct: (p: Product) => void;
  profile: string;
}) {
  switch (page) {
    case "dashboard":
      return <Dashboard navigate={navigate} setModal={setModal} />;
    case "products":
      return <Products products={products} onProduct={onProduct} />;
    case "applications":
      return <Applications products={products} notify={notify} />;
    case "equivalents":
      return <Equivalents notify={notify} />;
    case "clients":
      return <Clients setModal={setModal} />;
    case "suppliers":
      return <Suppliers setModal={setModal} />;
    case "purchases":
      return <Purchases setModal={setModal} />;
    case "inventory":
      return <Inventory products={products} setModal={setModal} />;
    case "sales":
      return <Sales setModal={setModal} />;
    case "closings":
      return <Closings setModal={setModal} />;
    case "finance":
      return <Finance />;
    case "reminders":
      return <Reminders setModal={setModal} notify={notify} />;
    case "reports":
      return <Reports />;
    case "admin":
      return <Admin profile={profile} notify={notify} />;
    case "audit":
      return <Audit />;
    case "settings":
      return <SettingsPage notify={notify} />;
  }
}

function Dashboard({
  navigate,
  setModal,
}: {
  navigate: (p: Page) => void;
  setModal: (m: string) => void;
}) {
  const stats = [
    ["Faturamento hoje", "R$ 8.742,30", "+12,4%", CircleDollarSign, "primary"],
    ["Faturamento no mês", "R$ 184.560,80", "+8,7%", TrendingUp, "primary"],
    ["Vendas realizadas", "42", "+6 hoje", ShoppingBag, "primary"],
    ["Ticket médio", "R$ 208,15", "-2,1%", ReceiptText, "info"],
    ["Estoque baixo", "7 produtos", "Requer atenção", AlertCircle, "warning"],
    ["Contas a receber", "R$ 37.820,00", "18 lançamentos", CreditCard, "info"],
    ["Fechamentos pendentes", "5", "R$ 14.680,50", ClipboardList, "warning"],
    ["Lembretes do dia", "3", "Próximo às 14:30", CalendarClock, "warning"],
  ];
  return (
    <div className="page-stack">
      <section className="stats-grid">
        {stats.map(([label, value, trend, Icon, tone]) => (
          <div className="stat-card" key={label as string}>
            <div className={`stat-icon ${tone}`}>
              <Icon size={20} />
            </div>
            <div className="stat-label">
              {label as string}
              <MoreHorizontal size={17} />
            </div>
            <strong>{value as string}</strong>
            <small className={tone as string}>{trend as string}</small>
          </div>
        ))}
      </section>
      <section className="dashboard-grid">
        <Card
          title="Evolução de vendas"
          subtitle="Faturamento nos últimos 7 dias"
          className="chart-card"
          action={
            <select>
              <option>Últimos 7 dias</option>
              <option>Este mês</option>
            </select>
          }
        >
          <div className="line-chart">
            <div className="chart-y">
              <span>12k</span>
              <span>8k</span>
              <span>4k</span>
              <span>0</span>
            </div>
            <svg viewBox="0 0 700 210" preserveAspectRatio="none">
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2563eb" stopOpacity=".26" />
                  <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="grid-line" d="M0 15H700M0 75H700M0 135H700M0 195H700" />
              <path
                className="area"
                d="M0 162 C60 145 70 121 120 130 S200 100 240 112 S320 67 360 83 S435 105 480 72 S560 35 600 54 S660 15 700 29 L700 210 L0 210Z"
              />
              <path
                className="line"
                d="M0 162 C60 145 70 121 120 130 S200 100 240 112 S320 67 360 83 S435 105 480 72 S560 35 600 54 S660 15 700 29"
              />
            </svg>
            <div className="chart-x">
              <span>16 Mai</span>
              <span>17 Mai</span>
              <span>18 Mai</span>
              <span>19 Mai</span>
              <span>20 Mai</span>
              <span>21 Mai</span>
              <span>Hoje</span>
            </div>
          </div>
        </Card>
        <Card title="Categorias em destaque" subtitle="Participação no faturamento">
          <div className="donut-wrap">
            <div className="donut">
              <div>
                <strong>R$ 184,5k</strong>
                <small>Total</small>
              </div>
            </div>
            <div className="legend">
              {[
                ["Freios", "31%", "#2563eb"],
                ["Suspensão", "24%", "#14b8a6"],
                ["Motor", "19%", "#8b5cf6"],
                ["Outros", "26%", "#cbd5e1"],
              ].map(([a, b, c]) => (
                <div key={a}>
                  <i style={{ background: c }} />
                  <span>{a}</span>
                  <strong>{b}</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
      <section className="dashboard-grid lower">
        <Card
          title="Vendas recentes"
          subtitle="Últimas movimentações registradas"
          className="recent-sales"
          action={
            <button className="link-button" onClick={() => navigate("sales")}>
              Ver todas <ChevronRight size={15} />
            </button>
          }
        >
          <DataTable headers={["Venda", "Cliente", "Vendedor", "Data", "Valor", "Status"]}>
            {sales.slice(0, 4).map((s) => (
              <tr key={s.id}>
                <td>
                  <button className="table-link" onClick={() => setModal("sale-detail")}>
                    {s.id}
                  </button>
                </td>
                <td>{s.client}</td>
                <td>{s.seller}</td>
                <td>{s.date}</td>
                <td>
                  <strong>{money(s.value)}</strong>
                </td>
                <td>
                  <Status value={s.status} />
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>
        <Card title="Ações rápidas" subtitle="Atalhos mais utilizados">
          <div className="quick-actions">
            <button onClick={() => setModal("new-sale")}>
              <span className="blue">
                <ShoppingCart size={20} />
              </span>
              <div>
                <strong>Nova venda</strong>
                <small>Iniciar atendimento</small>
              </div>
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setModal("new-product")}>
              <span className="violet">
                <Package size={20} />
              </span>
              <div>
                <strong>Cadastrar produto</strong>
                <small>Adicionar ao catálogo</small>
              </div>
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setModal("new-purchase")}>
              <span className="green">
                <Truck size={20} />
              </span>
              <div>
                <strong>Registrar compra</strong>
                <small>Entrada de mercadoria</small>
              </div>
              <ChevronRight size={16} />
            </button>
            <button onClick={() => navigate("inventory")}>
              <span className="orange">
                <Boxes size={20} />
              </span>
              <div>
                <strong>Consultar estoque</strong>
                <small>Ver saldos e alertas</small>
              </div>
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setModal("new-reminder")}>
              <span className="red">
                <CalendarClock size={20} />
              </span>
              <div>
                <strong>Criar lembrete</strong>
                <small>Agendar uma tarefa</small>
              </div>
              <ChevronRight size={16} />
            </button>
          </div>
        </Card>
      </section>
    </div>
  );
}

function Products({
  products,
  onProduct,
}: {
  products: Product[];
  onProduct: (p: Product) => void;
}) {
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("Todos");
  const filtered = products.filter(
    (p) =>
      `${p.code} ${p.name} ${p.maker} ${p.manufacturerCode}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (stockFilter === "Todos" || (stockFilter === "Baixo" ? p.stock <= p.min : p.stock > p.min)),
  );
  return (
    <Card className="table-card">
      <div className="filter-row">
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Código, EAN, OEM, descrição ou marca..."
          />
        </label>
        <select>
          <option>Todas as marcas</option>
          <option>Tecfil</option>
          <option>Cobreq</option>
          <option>NGK</option>
        </select>
        <select>
          <option>Todas as categorias</option>
          <option>Filtros</option>
          <option>Freios</option>
          <option>Motor</option>
        </select>
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
          <option>Todos</option>
          <option>Baixo</option>
          <option>Disponível</option>
        </select>
        <button className="secondary-button">
          <Filter size={17} /> Mais filtros
        </button>
      </div>
      <div className="result-count">
        <strong>{filtered.length} produtos</strong>
        <span>Catálogo atualizado agora</span>
      </div>
      <DataTable
        headers={[
          "Código",
          "Produto",
          "Marca",
          "Custo",
          "Margem",
          "Preço",
          "Estoque",
          "Status",
          "Ações",
        ]}
      >
        {filtered.map((p) => (
          <tr key={p.code}>
            <td>
              <button className="table-link" onClick={() => onProduct(p)}>
                {p.code}
              </button>
              <small>{p.manufacturerCode}</small>
            </td>
            <td>
              <strong>{p.name}</strong>
              <small>{p.category}</small>
            </td>
            <td>{p.maker}</td>
            <td>{money(p.cost)}</td>
            <td>{Math.round(p.margin * 100)}%</td>
            <td>
              <strong>{money(p.price)}</strong>
            </td>
            <td>
              <strong>{p.stock} un.</strong>
              <small>Mín. {p.min}</small>
            </td>
            <td>
              <Status
                value={
                  p.stock === 0 ? "Sem estoque" : p.stock <= p.min ? "Estoque baixo" : "Disponível"
                }
              />
            </td>
            <td>
              <button className="row-action" onClick={() => onProduct(p)}>
                <MoreHorizontal size={18} />
              </button>
            </td>
          </tr>
        ))}
      </DataTable>
      {!filtered.length && (
        <EmptyState
          icon={Package}
          title="Nenhum produto encontrado"
          text="Tente alterar os termos ou remover um filtro."
        />
      )}
      <Pagination />
    </Card>
  );
}

function ProductDetail({
  product,
  onBack,
  onEdit,
  notify,
}: {
  product: Product;
  onBack: () => void;
  onEdit: () => void;
  notify: (m: string) => void;
}) {
  const [tab, setTab] = useState("Informações gerais");
  const tabs = [
    "Informações gerais",
    "Aplicações",
    "Equivalentes",
    "Estoque",
    "Preços",
    "Histórico de vendas",
    "Auditoria",
  ];
  return (
    <div className="page-stack">
      <div className="detail-actions">
        <button className="secondary-button" onClick={onBack}>
          <ArrowLeft size={17} /> Voltar
        </button>
        <div>
          <button
            className="secondary-button"
            onClick={() => notify("Relatório do produto preparado para impressão.")}
          >
            <FileBarChart size={17} /> Relatório
          </button>
          <Button icon={Pencil} onClick={onEdit}>
            Editar produto
          </Button>
        </div>
      </div>
      <Card className="detail-card">
        <div className="product-hero">
          <div className="product-icon">
            <Package size={30} />
          </div>
          <div>
            <span>
              <Status value={product.stock <= product.min ? "Estoque baixo" : "Ativo"} />
            </span>
            <h2>{product.name}</h2>
            <p>
              {product.maker} · {product.category} · Cód. fabricante {product.manufacturerCode}
            </p>
          </div>
          <div className="product-balance">
            <small>Estoque atual</small>
            <strong>{product.stock} un.</strong>
            <span>mínimo {product.min}</span>
          </div>
        </div>
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
        {tab === "Informações gerais" && (
          <div className="info-grid">
            <InfoSection
              title="Identificação"
              values={[
                ["Código interno", product.code],
                ["Código do fabricante", product.manufacturerCode],
                ["Descrição", product.name],
                ["Marca", product.maker],
                ["Categoria", product.category],
                ["Unidade de medida", "UN — Unidade"],
              ]}
            />
            <InfoSection
              title="Preço e margem"
              values={[
                ["Custo atual", money(product.cost)],
                ["Margem informada", `${Math.round(product.margin * 100)}%`],
                ["Preço de referência", money(product.price)],
                ["Última alteração", "20/05/2025 às 14:22"],
              ]}
            />
            <InfoSection
              title="Controle de estoque"
              values={[
                ["Estoque atual", `${product.stock} unidades`],
                ["Estoque mínimo", `${product.min} unidades`],
                ["Estoque máximo", `${product.max} unidades`],
                ["Localização física", product.location],
              ]}
            />
          </div>
        )}
        {tab === "Aplicações" && (
          <div className="tab-content">
            <div className="notice">
              <AlertCircle size={18} />
              <div>
                <strong>Dados demonstrativos</strong>
                <p>
                  As compatibilidades abaixo são exemplos e devem ser tecnicamente verificadas antes
                  do uso comercial.
                </p>
              </div>
            </div>
            <DataTable headers={["Fabricante", "Modelo", "Ano", "Motor", "Versão"]}>
              <tr>
                <td>Volkswagen</td>
                <td>Gol</td>
                <td>2013–2018</td>
                <td>1.6 MSI</td>
                <td>Trendline</td>
              </tr>
              <tr>
                <td>Volkswagen</td>
                <td>Voyage</td>
                <td>2014–2018</td>
                <td>1.6 MSI</td>
                <td>Comfortline</td>
              </tr>
            </DataTable>
          </div>
        )}
        {tab !== "Informações gerais" && tab !== "Aplicações" && (
          <EmptyState
            icon={History}
            title={`${tab} do produto`}
            text="Este painel está pronto para receber registros vinculados ao produto."
          />
        )}
      </Card>
    </div>
  );
}

function Applications({ products, notify }: { products: Product[]; notify: (m: string) => void }) {
  const [searched, setSearched] = useState(false);
  return (
    <div className="page-stack">
      <div className="notice">
        <AlertCircle size={18} />
        <div>
          <strong>Ambiente demonstrativo</strong>
          <p>
            As aplicações exibidas são exemplos fictícios e não representam compatibilidade
            tecnicamente verificada.
          </p>
        </div>
      </div>
      <Card
        title="Localizar peças por veículo"
        subtitle="Selecione os dados do veículo para consultar o catálogo"
      >
        <div className="vehicle-filters">
          <Field label="Fabricante">
            <select>
              <option>Volkswagen</option>
              <option>Fiat</option>
              <option>Chevrolet</option>
              <option>Toyota</option>
              <option>Hyundai</option>
            </select>
          </Field>
          <Field label="Modelo">
            <select>
              <option>Gol</option>
              <option>Voyage</option>
              <option>Polo</option>
            </select>
          </Field>
          <Field label="Ano">
            <select>
              <option>2017</option>
              <option>2018</option>
            </select>
          </Field>
          <Field label="Motor">
            <select>
              <option>1.6 MSI</option>
              <option>1.0 MPI</option>
            </select>
          </Field>
          <Field label="Versão">
            <select>
              <option>Comfortline</option>
              <option>Trendline</option>
            </select>
          </Field>
          <Button icon={Search} onClick={() => setSearched(true)}>
            Buscar peças
          </Button>
        </div>
      </Card>
      {searched ? (
        <Card
          title="Produtos compatíveis"
          subtitle="Volkswagen Gol 2017 · 1.6 MSI · Comfortline"
          action={
            <button
              className="secondary-button"
              onClick={() => notify("Associação de aplicação iniciada.")}
            >
              <Plus size={16} /> Associar produto
            </button>
          }
        >
          <div className="product-results">
            {products.slice(0, 4).map((p) => (
              <div key={p.code}>
                <div className="mini-product">
                  <Package size={23} />
                </div>
                <div>
                  <small>
                    {p.code} · {p.maker}
                  </small>
                  <strong>{p.name}</strong>
                  <span>{p.stock} em estoque</span>
                </div>
                <strong>{money(p.price)}</strong>
                <button className="secondary-button">Ver produto</button>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Car}
          title="Selecione um veículo"
          text="Os produtos compatíveis aparecerão aqui após a busca."
        />
      )}
    </div>
  );
}

function Equivalents({ notify }: { notify: (m: string) => void }) {
  const [items, setItems] = useState(["MANN W712/22", "FRAM PH5548", "MAHLE OC506"]);
  return (
    <div className="two-column">
      <Card title="Produto de referência" subtitle="Pesquise por código ou descrição">
        <label className="search-field">
          <Search size={17} />
          <input defaultValue="AG-00124" />
        </label>
        <div className="selected-reference">
          <div className="product-icon">
            <Package size={25} />
          </div>
          <div>
            <small>AG-00124 · TECFIL</small>
            <strong>Filtro de óleo PSL55</strong>
            <span>Código fabricante: PSL55</span>
          </div>
        </div>
        <div className="field-label">Observações</div>
        <textarea defaultValue="Verificar dimensões e rosca antes da substituição." />
      </Card>
      <Card
        title="Produtos equivalentes"
        subtitle={`${items.length} relações cadastradas`}
        action={
          <button
            className="secondary-button"
            onClick={() => {
              setItems([...items, "BOSCH P3312"]);
              notify("Equivalência adicionada e registrada na auditoria.");
            }}
          >
            <Plus size={16} /> Adicionar
          </button>
        }
      >
        <div className="equivalent-list">
          {items.map((item, i) => (
            <div key={item}>
              <span className="equiv-badge">{i + 1}</span>
              <div>
                <strong>{item}</strong>
                <small>Equivalência demonstrativa · relação direta</small>
              </div>
              <button
                onClick={() => {
                  setItems(items.filter((x) => x !== item));
                  notify("Equivalência removida e registrada na auditoria.");
                }}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Clients({ setModal }: { setModal: (m: string) => void }) {
  const rows = [
    [
      "Auto Center Avenida",
      "12.345.678/0001-90",
      "(11) 3456-7820",
      "Oficina",
      "R$ 8.000,00",
      "Ativo",
    ],
    [
      "Transportadora Horizonte",
      "45.112.903/0001-08",
      "(11) 3221-1040",
      "Frota",
      "R$ 20.000,00",
      "Ativo",
    ],
    [
      "Ricardo Nogueira",
      "291.***.***-12",
      "(11) 98842-5510",
      "Pessoa física",
      "R$ 1.500,00",
      "Ativo",
    ],
    [
      "Oficina São Lucas",
      "29.087.771/0001-44",
      "(11) 3762-0911",
      "Oficina",
      "R$ 5.000,00",
      "Inativo",
    ],
  ];
  return (
    <Card
      className="table-card"
      title="Clientes cadastrados"
      subtitle="248 registros"
      action={
        <Button icon={Plus} onClick={() => setModal("new-client")}>
          Novo cliente
        </Button>
      }
    >
      <div className="filter-row compact">
        <label className="search-field">
          <Search size={17} />
          <input placeholder="Nome, CPF/CNPJ, telefone ou e-mail..." />
        </label>
        <select>
          <option>Todos os tipos</option>
          <option>Oficina</option>
          <option>Frota</option>
        </select>
        <select>
          <option>Todos os status</option>
          <option>Ativo</option>
        </select>
      </div>
      <DataTable
        headers={["Cliente", "CPF/CNPJ", "Telefone", "Tipo", "Limite de crédito", "Status", ""]}
      >
        {rows.map((r) => (
          <tr key={r[0]}>
            <td>
              <button className="table-link" onClick={() => setModal("client-detail")}>
                {r[0]}
              </button>
              <small>cliente@exemplo.com.br</small>
            </td>
            {r.slice(1, 5).map((x) => (
              <td key={x}>{x}</td>
            ))}
            <td>
              <Status value={r[5]} />
            </td>
            <td>
              <button className="row-action">
                <MoreHorizontal size={18} />
              </button>
            </td>
          </tr>
        ))}
      </DataTable>
      <Pagination />
    </Card>
  );
}

function Suppliers({ setModal }: { setModal: (m: string) => void }) {
  const rows = [
    ["Distribuidora Paulista", "São Paulo/SP", "28 dias", "R$ 31.840,00", "Ativo"],
    ["AutoParts Nacional", "Campinas/SP", "21/28 dias", "R$ 18.260,00", "Ativo"],
    ["Componentes Sul", "Curitiba/PR", "30 dias", "R$ 12.415,00", "Ativo"],
    ["Importadora Veloz", "Santos/SP", "À vista", "R$ 7.980,00", "Em análise"],
  ];
  return (
    <Card
      className="table-card"
      title="Fornecedores"
      subtitle="32 parceiros comerciais"
      action={
        <Button icon={Plus} onClick={() => setModal("new-supplier")}>
          Novo fornecedor
        </Button>
      }
    >
      <div className="filter-row compact">
        <label className="search-field">
          <Search size={17} />
          <input placeholder="Razão social, CNPJ ou cidade..." />
        </label>
        <select>
          <option>Todos os status</option>
        </select>
      </div>
      <DataTable
        headers={["Fornecedor", "Localização", "Condição", "Compras no mês", "Status", ""]}
      >
        {rows.map((r) => (
          <tr key={r[0]}>
            <td>
              <button className="table-link">{r[0]}</button>
              <small>Contato comercial</small>
            </td>
            {r.slice(1, 4).map((x) => (
              <td key={x}>{x}</td>
            ))}
            <td>
              <Status value={r[4]} />
            </td>
            <td>
              <button className="row-action">
                <MoreHorizontal size={18} />
              </button>
            </td>
          </tr>
        ))}
      </DataTable>
    </Card>
  );
}

function Purchases({ setModal }: { setModal: (m: string) => void }) {
  return (
    <div className="page-stack">
      <section className="mini-stats">
        <MiniStat label="Compras no mês" value="R$ 76.495,00" icon={Truck} />
        <MiniStat label="Entradas pendentes" value="3 documentos" icon={ClipboardList} />
        <MiniStat label="Itens recebidos" value="1.248 un." icon={Boxes} />
        <MiniStat label="Custo médio" value="+2,4%" icon={TrendingUp} />
      </section>
      <Card
        title="Compras recentes"
        subtitle="Documentos de entrada registrados"
        action={
          <Button icon={Plus} onClick={() => setModal("new-purchase")}>
            Registrar compra
          </Button>
        }
      >
        <DataTable
          headers={["Documento", "Fornecedor", "Data", "Itens", "Valor total", "Situação", ""]}
        >
          {[
            [
              "NF 000.184.221",
              "Distribuidora Paulista",
              "22/05/2025",
              "18",
              "R$ 8.450,90",
              "Confirmada",
            ],
            [
              "NF 000.077.410",
              "AutoParts Nacional",
              "21/05/2025",
              "12",
              "R$ 5.720,00",
              "Confirmada",
            ],
            ["PED-00918", "Componentes Sul", "20/05/2025", "8", "R$ 3.142,80", "Pendente"],
          ].map((r) => (
            <tr key={r[0]}>
              {r.slice(0, 5).map((x, i) => (
                <td key={x}>{i === 0 ? <button className="table-link">{x}</button> : x}</td>
              ))}
              <td>
                <Status value={r[5]} />
              </td>
              <td>
                <button className="row-action">
                  <MoreHorizontal size={18} />
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}

function Inventory({ products, setModal }: { products: Product[]; setModal: (m: string) => void }) {
  return (
    <div className="page-stack">
      <section className="mini-stats">
        <MiniStat label="Produtos cadastrados" value="1.842" icon={Package} />
        <MiniStat label="Estoque baixo" value="7 produtos" icon={AlertCircle} tone="warning" />
        <MiniStat label="Sem estoque" value="3 produtos" icon={Boxes} tone="danger" />
        <MiniStat label="Movimentações hoje" value="86" icon={History} />
      </section>
      <Card
        className="table-card"
        title="Posição de estoque"
        subtitle="Saldos atualizados em tempo real"
      >
        <div className="filter-row compact">
          <label className="search-field">
            <Search size={17} />
            <input placeholder="Pesquisar produto ou código..." />
          </label>
          <select>
            <option>Todas as situações</option>
            <option>Estoque baixo</option>
            <option>Sem estoque</option>
          </select>
          <button className="secondary-button">
            <History size={16} /> Ver movimentações
          </button>
        </div>
        <DataTable
          headers={[
            "Produto",
            "Código",
            "Estoque atual",
            "Mínimo",
            "Máximo",
            "Localização",
            "Situação",
            "",
          ]}
        >
          {products.map((p) => (
            <tr key={p.code}>
              <td>
                <strong>{p.name}</strong>
                <small>{p.maker}</small>
              </td>
              <td>{p.code}</td>
              <td>
                <strong>{p.stock} un.</strong>
              </td>
              <td>{p.min}</td>
              <td>{p.max}</td>
              <td>
                <span className="location">{p.location}</span>
              </td>
              <td>
                <Status
                  value={
                    p.stock === 0 ? "Sem estoque" : p.stock <= p.min ? "Estoque baixo" : "Normal"
                  }
                />
              </td>
              <td>
                <button
                  className="secondary-button small"
                  onClick={() => setModal(`stock-adjust:${p.code}`)}
                >
                  Ajustar
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}

function Sales({ setModal }: { setModal: (m: string) => void }) {
  const [tab, setTab] = useState("Consulta de vendas");
  return (
    <div className="page-stack">
      <Tabs
        tabs={["Consulta de vendas", "Em aberto", "Devoluções", "Canceladas"]}
        value={tab}
        onChange={setTab}
      />
      <Card className="table-card">
        <div className="advanced-filter">
          <label className="search-field">
            <Search size={17} />
            <input placeholder="Número, produto, código, cliente ou observação..." />
          </label>
          <Field label="Data inicial">
            <input type="date" defaultValue="2025-05-01" />
          </Field>
          <Field label="Data final">
            <input type="date" defaultValue="2025-05-22" />
          </Field>
          <Field label="Status">
            <select>
              <option>Todos</option>
              <option>Concluída</option>
              <option>Em aberto</option>
            </select>
          </Field>
          <button className="secondary-button">
            <SlidersHorizontal size={16} /> Filtros avançados
          </button>
          <Button icon={Search}>Pesquisar</Button>
        </div>
        <div className="result-count">
          <strong>128 vendas encontradas</strong>
          <span>Valor líquido: R$ 42.580,60</span>
        </div>
        <DataTable
          headers={[
            "Venda",
            "Cliente",
            "Vendedor",
            "Data e hora",
            "Pagamento",
            "Valor",
            "Status",
            "",
          ]}
        >
          {sales.map((s) => (
            <tr key={s.id}>
              <td>
                <button className="table-link" onClick={() => setModal("sale-detail")}>
                  {s.id}
                </button>
              </td>
              <td>{s.client}</td>
              <td>{s.seller}</td>
              <td>{s.date}</td>
              <td>{s.status === "Em aberto" ? "A prazo" : "PIX"}</td>
              <td>
                <strong>{money(s.value)}</strong>
              </td>
              <td>
                <Status value={s.status} />
              </td>
              <td>
                <button className="row-action" onClick={() => setModal("sale-detail")}>
                  <ChevronRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
        <Pagination />
      </Card>
    </div>
  );
}

function Closings({ setModal }: { setModal: (m: string) => void }) {
  const [selected, setSelected] = useState([true, true, false]);
  const open = [
    { id: "#VD-2812", date: "05/05/2025", value: 1248.5 },
    { id: "#VD-2826", date: "12/05/2025", value: 862.4 },
    { id: "#VD-2839", date: "22/05/2025", value: 1248.5 },
  ];
  const total = open.reduce((a, x, i) => a + (selected[i] ? x.value : 0), 0);
  return (
    <div className="closing-layout">
      <Card title="Gerar novo fechamento" subtitle="Selecione um cliente e as vendas em aberto">
        <Field label="Cliente">
          <select>
            <option>Transportadora Horizonte</option>
            <option>Auto Center Avenida</option>
          </select>
        </Field>
        <div className="open-sales">
          <div className="select-all">
            <strong>Vendas disponíveis</strong>
            <span>3 registros</span>
          </div>
          {open.map((x, i) => (
            <label key={x.id}>
              <input
                type="checkbox"
                checked={selected[i]}
                onChange={() => setSelected(selected.map((v, n) => (n === i ? !v : v)))}
              />
              <div>
                <strong>{x.id}</strong>
                <small>{x.date} · Em aberto</small>
              </div>
              <b>{money(x.value)}</b>
            </label>
          ))}
        </div>
      </Card>
      <aside>
        <Card title="Resumo do fechamento">
          <div className="summary-lines">
            <div>
              <span>Cliente</span>
              <strong>Transportadora Horizonte</strong>
            </div>
            <div>
              <span>Período</span>
              <strong>05/05 a 22/05/2025</strong>
            </div>
            <div>
              <span>Vendas selecionadas</span>
              <strong>{selected.filter(Boolean).length}</strong>
            </div>
            <hr />
            <div className="summary-total">
              <span>Valor total</span>
              <strong>{money(total)}</strong>
            </div>
          </div>
          <Button icon={ClipboardCheck} full onClick={() => setModal("confirm-closing")}>
            Gerar fechamento
          </Button>
        </Card>
      </aside>
      <Card
        className="closing-history"
        title="Fechamentos anteriores"
        subtitle="Histórico do cliente"
      >
        <DataTable
          headers={["Fechamento", "Período", "Vendas", "Total", "Pago", "Saldo", "Status"]}
        >
          <tr>
            <td>#FCH-0192</td>
            <td>01/04 a 30/04</td>
            <td>8</td>
            <td>R$ 8.740,20</td>
            <td>R$ 8.740,20</td>
            <td>R$ 0,00</td>
            <td>
              <Status value="Pago" />
            </td>
          </tr>
          <tr>
            <td>#FCH-0178</td>
            <td>01/03 a 31/03</td>
            <td>6</td>
            <td>R$ 6.182,90</td>
            <td>R$ 4.000,00</td>
            <td>R$ 2.182,90</td>
            <td>
              <Status value="Parcial" />
            </td>
          </tr>
        </DataTable>
      </Card>
    </div>
  );
}

function Finance() {
  return (
    <div className="page-stack">
      <section className="mini-stats">
        <MiniStat
          label="Recebido no mês"
          value="R$ 142.680,30"
          icon={CircleDollarSign}
          tone="success"
        />
        <MiniStat
          label="Valores em aberto"
          value="R$ 37.820,00"
          icon={CalendarClock}
          tone="warning"
        />
        <MiniStat label="Pagamentos registrados" value="186" icon={ReceiptText} />
        <MiniStat label="Fechamentos pendentes" value="R$ 14.680,50" icon={ClipboardList} />
      </section>
      <div className="notice">
        <AlertCircle size={18} />
        <div>
          <strong>Visão financeira</strong>
          <p>Os valores recebidos são apresentados separadamente do faturamento comercial.</p>
        </div>
      </div>
      <Card
        className="table-card"
        title="Movimentações financeiras"
        subtitle="Recebimentos e valores a receber"
      >
        <div className="filter-row compact">
          <select>
            <option>Este mês</option>
          </select>
          <select>
            <option>Todos os clientes</option>
          </select>
          <select>
            <option>Todos os status</option>
          </select>
        </div>
        <DataTable
          headers={["Lançamento", "Cliente", "Origem", "Vencimento", "Valor", "Recebido", "Status"]}
        >
          {[
            [
              "#REC-1048",
              "Auto Center Avenida",
              "#VD-2841",
              "22/05/2025",
              "R$ 642,80",
              "R$ 642,80",
              "Recebido",
            ],
            [
              "#REC-1047",
              "Transportadora Horizonte",
              "#VD-2839",
              "05/06/2025",
              "R$ 1.248,50",
              "R$ 0,00",
              "Em aberto",
            ],
            [
              "#REC-1038",
              "Oficina São Lucas",
              "#FCH-0195",
              "20/05/2025",
              "R$ 3.890,00",
              "R$ 2.000,00",
              "Parcial",
            ],
          ].map((r) => (
            <tr key={r[0]}>
              {r.slice(0, 6).map((x, i) => (
                <td key={x}>{i === 0 ? <button className="table-link">{x}</button> : x}</td>
              ))}
              <td>
                <Status value={r[6]} />
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}

function Reminders({
  setModal,
  notify,
}: {
  setModal: (m: string) => void;
  notify: (m: string) => void;
}) {
  return (
    <div className="page-stack">
      <div className="reminder-board">
        {[
          ["Hoje", "Ligar para confirmar entrega", "14:30", "Auto Center Avenida", "Pendente"],
          ["Hoje", "Revisar estoque de filtros", "16:00", "Equipe de estoque", "Pendente"],
          ["Amanhã", "Cobrar fechamento mensal", "09:00", "Transportadora Horizonte", "Agendado"],
        ].map((r) => (
          <div className="reminder-card" key={r[1]}>
            <div className="reminder-time">
              <strong>{r[2]}</strong>
              <small>{r[0]}</small>
            </div>
            <div>
              <Status value={r[4]} />
              <h3>{r[1]}</h3>
              <p>{r[3]}</p>
            </div>
            <div className="reminder-actions">
              <button onClick={() => notify("Lembrete marcado como concluído.")}>
                <Check size={17} />
              </button>
              <button>
                <MoreHorizontal size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button className="dashed-add" onClick={() => setModal("new-reminder")}>
        <Plus size={19} /> Criar novo lembrete
      </button>
    </div>
  );
}

function Reports() {
  const reports = [
    ["Vendas por período", "Analise faturamento, ticket e quantidade de vendas.", TrendingUp],
    ["Vendas por vendedor", "Compare desempenho comercial da equipe.", Users],
    ["Produtos mais vendidos", "Ranking por quantidade e faturamento.", Package],
    ["Estoque baixo", "Itens abaixo do mínimo configurado.", AlertCircle],
    ["Histórico de devoluções", "Produtos e valores devolvidos no período.", RotateCcw],
    ["Cancelamentos", "Motivos e impacto das vendas canceladas.", X],
    ["Valores em aberto", "Saldos pendentes por cliente e vencimento.", CreditCard],
  ];
  return (
    <div>
      <div className="section-callout">
        <div>
          <span>RELATÓRIOS GERENCIAIS</span>
          <h2>Transforme dados em decisões melhores</h2>
          <p>Visualizações demonstrativas preparadas para a evolução do MVP.</p>
        </div>
        <ChartNoAxesCombined size={62} />
      </div>
      <div className="report-grid">
        {reports.map(([a, b, I]) => (
          <button key={a as string}>
            <span>
              <I size={22} />
            </span>
            <div>
              <strong>{a as string}</strong>
              <small>{b as string}</small>
            </div>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Admin({ profile, notify }: { profile: string; notify: (m: string) => void }) {
  const [role, setRole] = useState(profile);
  const perms = [
    "Visualizar dashboard",
    "Cadastrar e editar produtos",
    "Ajustar estoque",
    "Registrar compras",
    "Realizar vendas",
    "Alterar preço na venda",
    "Cancelar vendas",
    "Acessar financeiro",
    "Gerenciar usuários",
  ];
  return (
    <div className="admin-grid">
      <Card
        title="Usuários"
        subtitle="6 usuários ativos"
        action={
          <button className="secondary-button">
            <Plus size={16} /> Novo usuário
          </button>
        }
      >
        <div className="user-list">
          {[
            ["MC", "Mariana Costa", "Administrador", "Online"],
            ["RL", "Rafael Lima", "Vendedor", "Ativo"],
            ["AM", "Ana Martins", "Estoque/Compras", "Ativo"],
            ["CF", "Camila Freitas", "Financeiro", "Ativo"],
          ].map((u) => (
            <button key={u[1]}>
              <span>{u[0]}</span>
              <div>
                <strong>{u[1]}</strong>
                <small>{u[2]}</small>
              </div>
              <Status value={u[3]} />
            </button>
          ))}
        </div>
      </Card>
      <Card title="Perfis e permissões" subtitle="Controle de acesso por função">
        <div className="role-tabs">
          {["Administrador", "Vendedor", "Estoque/Compras", "Financeiro"].map((r) => (
            <button className={role === r ? "active" : ""} onClick={() => setRole(r)} key={r}>
              {r}
            </button>
          ))}
        </div>
        <div className="permission-list">
          {perms.map((p, i) => (
            <label key={p}>
              <div>
                <strong>{p}</strong>
                <small>{i < 3 ? "Operação principal" : "Permissão específica"}</small>
              </div>
              <input
                type="checkbox"
                defaultChecked={
                  role === "Administrador" || (role === "Vendedor" && [0, 4, 5].includes(i))
                }
              />
            </label>
          ))}
        </div>
        <Button full onClick={() => notify(`Permissões do perfil ${role} atualizadas.`)}>
          Salvar permissões
        </Button>
      </Card>
    </div>
  );
}

function Audit() {
  return (
    <Card className="table-card">
      <div className="filter-row">
        <label className="search-field">
          <Search size={17} />
          <input placeholder="Buscar por registro, usuário ou operação..." />
        </label>
        <select>
          <option>Todos os usuários</option>
        </select>
        <select>
          <option>Todas as operações</option>
        </select>
        <select>
          <option>Todas as entidades</option>
        </select>
        <button className="secondary-button">
          <CalendarClock size={16} /> Período
        </button>
      </div>
      <DataTable
        headers={[
          "Data e hora",
          "Usuário",
          "Operação",
          "Entidade",
          "Registro",
          "Valor anterior",
          "Valor posterior",
        ]}
      >
        {auditRows.map((r) => (
          <tr key={r.join()}>
            {r.map((x, i) => (
              <td key={x}>{i === 2 ? <strong>{x}</strong> : x}</td>
            ))}
          </tr>
        ))}
      </DataTable>
      <Pagination />
    </Card>
  );
}

function SettingsPage({ notify }: { notify: (m: string) => void }) {
  return (
    <div className="settings-grid">
      <Card title="Dados da empresa" subtitle="Informações exibidas em documentos internos">
        <div className="form-grid">
          <Field label="Razão social">
            <input defaultValue="Auto Peças Brasil Ltda." />
          </Field>
          <Field label="CNPJ">
            <input defaultValue="12.345.678/0001-90" />
          </Field>
          <Field label="Nome fantasia">
            <input defaultValue="Auto Peças Brasil" />
          </Field>
          <Field label="Telefone">
            <input defaultValue="(11) 3456-7890" />
          </Field>
          <Field label="E-mail">
            <input defaultValue="contato@autopecasbrasil.com.br" />
          </Field>
          <Field label="Cidade/UF">
            <input defaultValue="São Paulo/SP" />
          </Field>
        </div>
      </Card>
      <Card title="Preferências comerciais" subtitle="Parâmetros padrão da operação">
        <div className="settings-list">
          <label>
            <div>
              <strong>Permitir preço abaixo da referência</strong>
              <small>Apenas vendedores com permissão específica</small>
            </div>
            <input type="checkbox" defaultChecked />
          </label>
          <label>
            <div>
              <strong>Alertas de estoque mínimo</strong>
              <small>Exibir avisos no dashboard e notificações</small>
            </div>
            <input type="checkbox" defaultChecked />
          </label>
          <label>
            <div>
              <strong>Venda sem identificação do cliente</strong>
              <small>Permitir uso de AO CONSUMIDOR</small>
            </div>
            <input type="checkbox" defaultChecked />
          </label>
        </div>
      </Card>
      <div className="settings-save">
        <Button onClick={() => notify("Configurações salvas com sucesso.")}>
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}

function ModalFlow({
  type,
  products,
  close,
  notify,
  setProducts,
  navigate,
}: {
  type: string;
  products: Product[];
  close: () => void;
  notify: (m: string) => void;
  setProducts: (p: Product[]) => void;
  navigate: (p: Page) => void;
}) {
  if (type === "reminder-popup") return <ReminderPopup close={close} notify={notify} />;
  if (type === "new-sale") return <PosModal products={products} close={close} notify={notify} />;
  if (type === "sale-detail")
    return <SaleDetail close={close} setType={() => {}} notify={notify} />;
  const complete = (message: string, next?: Page) => {
    notify(message);
    close();
    if (next) navigate(next);
  };
  if (type.startsWith("stock-adjust")) {
    const code = type.split(":")[1] || products[1].code;
    const product = products.find((p) => p.code === code) || products[1];
    return (
      <Dialog
        title="Ajuste de estoque"
        subtitle="A alteração será registrada na auditoria"
        close={close}
      >
        <div className="form-stack">
          <Field label="Produto">
            <input value={`${product.code} — ${product.name}`} readOnly />
          </Field>
          <div className="form-grid">
            <Field label="Quantidade atual">
              <input value={product.stock} readOnly />
            </Field>
            <Field label="Nova quantidade">
              <input id="new-stock" type="number" defaultValue={product.stock + 2} />
            </Field>
          </div>
          <div className="calculated">
            <span>Diferença calculada</span>
            <strong>+2 unidades</strong>
          </div>
          <Field label="Motivo obrigatório">
            <textarea
              placeholder="Descreva o motivo do ajuste..."
              defaultValue="Contagem física de inventário"
            />
          </Field>
          <div className="dialog-footer">
            <button className="secondary-button" onClick={close}>
              Cancelar
            </button>
            <Button
              onClick={() => {
                setProducts(
                  products.map((p) => (p.code === product.code ? { ...p, stock: p.stock + 2 } : p)),
                );
                complete("Estoque ajustado e auditoria registrada.");
              }}
            >
              Confirmar ajuste
            </Button>
          </div>
        </div>
      </Dialog>
    );
  }
  if (type === "new-product")
    return (
      <Dialog
        wide
        title="Cadastrar produto"
        subtitle="Preencha os dados de identificação, preço e estoque"
        close={close}
      >
        <ProductForm
          onSave={() => {
            const p = {
              code: `AG-00${products.length + 620}`,
              name: "Sensor de rotação",
              maker: "Bosch",
              cost: 84.5,
              margin: 0.4,
              price: 140.83,
              stock: 8,
              min: 4,
              max: 20,
              location: "C-04-02",
              category: "Injeção",
              manufacturerCode: "0261210170",
            };
            setProducts([...products, p]);
            complete("Produto cadastrado com sucesso.", "products");
          }}
          close={close}
        />
      </Dialog>
    );
  if (type === "new-purchase")
    return (
      <Dialog
        wide
        title="Registrar compra"
        subtitle="A confirmação atualizará os saldos de estoque"
        close={close}
      >
        <PurchaseForm
          complete={() => {
            setProducts(
              products.map((p, i) => (i < 2 ? { ...p, stock: p.stock + (i ? 10 : 20) } : p)),
            );
            complete("Compra confirmada: estoque e movimentações atualizados.", "inventory");
          }}
          close={close}
        />
      </Dialog>
    );
  if (type === "new-reminder")
    return (
      <Dialog
        title="Novo lembrete"
        subtitle="Agende uma tarefa para você ou para a equipe"
        close={close}
      >
        <div className="form-stack">
          <Field label="Título">
            <input defaultValue="Retornar orçamento ao cliente" />
          </Field>
          <Field label="Descrição">
            <textarea placeholder="Detalhes do lembrete..." />
          </Field>
          <div className="form-grid">
            <Field label="Data">
              <input type="date" defaultValue="2025-05-22" />
            </Field>
            <Field label="Horário">
              <input type="time" defaultValue="14:30" />
            </Field>
            <Field label="Responsável">
              <select>
                <option>Mariana Costa</option>
                <option>Equipe comercial</option>
              </select>
            </Field>
            <Field label="Compartilhamento">
              <select>
                <option>Somente responsável</option>
                <option>Todos</option>
              </select>
            </Field>
          </div>
          <Field label="Cliente relacionado (opcional)">
            <select>
              <option>Auto Center Avenida</option>
              <option>Transportadora Horizonte</option>
            </select>
          </Field>
          <div className="dialog-footer">
            <button className="secondary-button" onClick={close}>
              Cancelar
            </button>
            <Button onClick={() => complete("Lembrete criado para hoje às 14:30.")}>
              Criar lembte
            </Button>
          </div>
        </div>
      </Dialog>
    );
  if (type === "confirm-closing")
    return (
      <Dialog
        title="Confirmar fechamento"
        subtitle="As vendas continuarão disponíveis individualmente"
        close={close}
      >
        <div className="confirmation-visual">
          <div>
            <ClipboardCheck size={30} />
          </div>
          <h3>Gerar fechamento de R$ 2.110,90?</h3>
          <p>2 vendas da Transportadora Horizonte serão agrupadas neste fechamento.</p>
        </div>
        <Field label="Vencimento">
          <input type="date" defaultValue="2025-06-05" />
        </Field>
        <div className="dialog-footer">
          <button className="secondary-button" onClick={close}>
            Voltar
          </button>
          <Button onClick={() => complete("Fechamento #FCH-0196 gerado com sucesso.")}>
            Confirmar fechamento
          </Button>
        </div>
      </Dialog>
    );
  if (type === "new-client" || type === "new-supplier")
    return (
      <Dialog
        title={type === "new-client" ? "Novo cliente" : "Novo fornecedor"}
        subtitle="Preencha os dados cadastrais"
        close={close}
      >
        <div className="form-grid">
          <Field label="Nome / razão social">
            <input />
          </Field>
          <Field label="CPF / CNPJ">
            <input />
          </Field>
          <Field label="Telefone">
            <input />
          </Field>
          <Field label="E-mail">
            <input type="email" />
          </Field>
          <Field label="Condição de pagamento">
            <select>
              <option>À vista</option>
              <option>28 dias</option>
            </select>
          </Field>
          <Field label="Status">
            <select>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </Field>
        </div>
        <Field label="Endereço">
          <input />
        </Field>
        <div className="dialog-footer">
          <button className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <Button onClick={() => complete("Cadastro salvo com sucesso.")}>Salvar cadastro</Button>
        </div>
      </Dialog>
    );
  if (type === "client-detail")
    return (
      <Dialog
        wide
        title="Auto Center Avenida"
        subtitle="Cliente desde março de 2022 · Ativo"
        close={close}
      >
        <Tabs
          tabs={[
            "Dados gerais",
            "Histórico de compras",
            "Vendas em aberto",
            "Fechamentos",
            "Pagamentos",
            "Lembretes",
          ]}
          value="Dados gerais"
          onChange={() => {}}
        />
        <div className="info-grid modal-info">
          <InfoSection
            title="Cadastro"
            values={[
              ["Razão social", "Auto Center Avenida Ltda."],
              ["CNPJ", "12.345.678/0001-90"],
              ["Telefone", "(11) 3456-7820"],
              ["E-mail", "financeiro@autocenteravenida.com.br"],
            ]}
          />
          <InfoSection
            title="Condição comercial"
            values={[
              ["Tipo", "Oficina"],
              ["Pagamento", "Fechamento quinzenal"],
              ["Limite de crédito", "R$ 8.000,00"],
              ["Saldo em aberto", "R$ 1.420,60"],
            ]}
          />
        </div>
      </Dialog>
    );
  return null;
}

function PosModal({
  products,
  close,
  notify,
}: {
  products: Product[];
  close: () => void;
  notify: (m: string) => void;
}) {
  const [cart, setCart] = useState([
    { ...products[0], qty: 2, salePrice: products[0].price },
    { ...products[2], qty: 4, salePrice: 35 },
  ]);
  const [receipt, setReceipt] = useState(false);
  const total = cart.reduce((a, p) => a + p.qty * p.salePrice, 0);
  if (receipt)
    return (
      <Dialog title="Venda concluída" subtitle="Comprovante interno #VD-2842" close={close}>
        <div className="receipt">
          <div className="success-circle">
            <Check size={27} />
          </div>
          <h2>{money(total)}</h2>
          <p>Pagamento via PIX confirmado</p>
          <hr />
          {cart.map((p) => (
            <div key={p.code}>
              <span>
                {p.qty}× {p.name}
              </span>
              <strong>{money(p.qty * p.salePrice)}</strong>
            </div>
          ))}
          <hr />
          <div>
            <span>Cliente</span>
            <strong>AO CONSUMIDOR</strong>
          </div>
          <div>
            <span>Vendedor</span>
            <strong>Mariana Costa</strong>
          </div>
        </div>
        <div className="dialog-footer">
          <button className="secondary-button">
            <ReceiptText size={16} /> Imprimir
          </button>
          <Button
            onClick={() => {
              notify("Venda registrada e estoque atualizado.");
              close();
            }}
          >
            Concluir
          </Button>
        </div>
      </Dialog>
    );
  return (
    <div className="overlay">
      <div className="pos-modal">
        <header>
          <div>
            <span>
              <ShoppingCart size={22} />
            </span>
            <div>
              <h2>Nova venda</h2>
              <p>Atendimento em andamento</p>
            </div>
          </div>
          <button onClick={close}>
            <X size={21} />
          </button>
        </header>
        <div className="pos-body">
          <section className="pos-products">
            <label className="search-field">
              <Search size={18} />
              <input autoFocus placeholder="Código ou descrição do produto..." />
            </label>
            <h4>Produtos disponíveis</h4>
            {products.slice(0, 5).map((p) => (
              <button
                key={p.code}
                onClick={() => setCart([...cart, { ...p, qty: 1, salePrice: p.price }])}
              >
                <div className="mini-product">
                  <Package size={20} />
                </div>
                <div>
                  <small>
                    {p.code} · {p.maker}
                  </small>
                  <strong>{p.name}</strong>
                  <span>{p.stock} un. disponíveis</span>
                </div>
                <b>{money(p.price)}</b>
                <Plus size={18} />
              </button>
            ))}
          </section>
          <section className="pos-cart">
            <div className="pos-section-title">
              <div>
                <h3>Itens da venda</h3>
                <span>{cart.length} produtos</span>
              </div>
              <button onClick={() => setCart([])}>
                <Trash2 size={16} /> Limpar
              </button>
            </div>
            <div className="cart-head">
              <span>Produto</span>
              <span>Qtd.</span>
              <span>Preço unit.</span>
              <span>Subtotal</span>
              <span />
            </div>
            {cart.map((p, i) => (
              <div className="cart-line" key={`${p.code}${i}`}>
                <div>
                  <small>{p.code}</small>
                  <strong>{p.name}</strong>
                </div>
                <div className="qty">
                  <button
                    onClick={() =>
                      setCart(
                        cart.map((x, n) => (n === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x)),
                      )
                    }
                  >
                    −
                  </button>
                  <b>{p.qty}</b>
                  <button
                    onClick={() =>
                      setCart(cart.map((x, n) => (n === i ? { ...x, qty: x.qty + 1 } : x)))
                    }
                  >
                    +
                  </button>
                </div>
                <label>
                  R${" "}
                  <input
                    value={p.salePrice.toFixed(2).replace(".", ",")}
                    onChange={(e) =>
                      setCart(
                        cart.map((x, n) =>
                          n === i
                            ? { ...x, salePrice: Number(e.target.value.replace(",", ".")) || 0 }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <strong>{money(p.qty * p.salePrice)}</strong>
                <button onClick={() => setCart(cart.filter((_, n) => n !== i))}>
                  <X size={17} />
                </button>
              </div>
            ))}
          </section>
          <aside className="pos-summary">
            <Field label="Cliente">
              <select>
                <option>AO CONSUMIDOR</option>
                <option>Auto Center Avenida</option>
              </select>
            </Field>
            <Field label="Vendedor">
              <select>
                <option>Mariana Costa</option>
                <option>Rafael Lima</option>
              </select>
            </Field>
            <Field label="Observações">
              <textarea placeholder="Informações adicionais..." />
            </Field>
            <div className="sale-totals">
              <div>
                <span>Subtotal</span>
                <strong>{money(total)}</strong>
              </div>
              <div>
                <span>Ajuste de preços</span>
                <strong className="positive">- R$ 9,32</strong>
              </div>
              <hr />
              <div className="grand-total">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
            </div>
            <Field label="Condição de pagamento">
              <select>
                <option>PIX — imediato</option>
                <option>Dinheiro</option>
                <option>Cartão de crédito</option>
                <option>Em aberto — pagamento posterior</option>
              </select>
            </Field>
            <button
              className="finish-sale"
              disabled={!cart.length}
              onClick={() => setReceipt(true)}
            >
              <Check size={19} /> Finalizar venda
            </button>
            <small className="secure-note">
              <ShieldCheck size={14} /> A baixa do estoque será automática
            </small>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SaleDetail({
  close,
  notify,
}: {
  close: () => void;
  setType: () => void;
  notify: (m: string) => void;
}) {
  const [sub, setSub] = useState<"detail" | "return" | "cancel">("detail");
  const [cancelled, setCancelled] = useState(false);
  if (sub === "cancel")
    return (
      <Dialog
        title="Cancelar venda #VD-2838"
        subtitle="Esta ação não removerá a venda do histórico"
        close={() => setSub("detail")}
      >
        <div className="danger-notice">
          <AlertCircle size={20} />
          <div>
            <strong>Atenção: a saída de estoque será revertida</strong>
            <p>O valor também será excluído dos indicadores de faturamento válido.</p>
          </div>
        </div>
        <Field label="Motivo obrigatório">
          <textarea
            placeholder="Informe o motivo do cancelamento..."
            defaultValue="Venda registrada em duplicidade"
          />
        </Field>
        <div className="dialog-footer">
          <button className="secondary-button" onClick={() => setSub("detail")}>
            Voltar
          </button>
          <button
            className="danger-button"
            onClick={() => {
              setCancelled(true);
              setSub("detail");
              notify("Venda cancelada, estoque revertido e auditoria registrada.");
            }}
          >
            Confirmar cancelamento
          </button>
        </div>
      </Dialog>
    );
  if (sub === "return")
    return (
      <Dialog
        wide
        title="Registrar devolução"
        subtitle="Venda #VD-2838 · devolução parcial ou total"
        close={() => setSub("detail")}
      >
        <DataTable
          headers={[
            "Produto",
            "Qtd. original",
            "Já devolvida",
            "Nova devolução",
            "Qtd. líquida",
            "Valor devolvido",
          ]}
        >
          <tr>
            <td>
              <strong>Pastilha de freio dianteira</strong>
              <small>AG-00286</small>
            </td>
            <td>2</td>
            <td>0</td>
            <td>
              <input className="table-input" type="number" defaultValue="1" min="0" max="2" />
            </td>
            <td>1</td>
            <td>R$ 115,00</td>
          </tr>
          <tr>
            <td>
              <strong>Fluido de freio DOT 4</strong>
              <small>AG-00891</small>
            </td>
            <td>2</td>
            <td>0</td>
            <td>
              <input className="table-input" type="number" defaultValue="0" min="0" max="2" />
            </td>
            <td>2</td>
            <td>R$ 0,00</td>
          </tr>
        </DataTable>
        <div className="return-summary">
          <div>
            <span>Valor original</span>
            <strong>R$ 398,20</strong>
          </div>
          <div>
            <span>Valor devolvido</span>
            <strong>- R$ 115,00</strong>
          </div>
          <div>
            <span>Valor líquido</span>
            <strong>R$ 283,20</strong>
          </div>
        </div>
        <div className="dialog-footer">
          <button className="secondary-button" onClick={() => setSub("detail")}>
            Cancelar
          </button>
          <Button
            onClick={() => {
              setSub("detail");
              notify("Devolução registrada e item retornado ao estoque.");
            }}
          >
            Confirmar devolução
          </Button>
        </div>
      </Dialog>
    );
  return (
    <Dialog
      wide
      title="#VD-2838"
      subtitle={`Venda realizada em 21/05/2025 às 17:46 · ${cancelled ? "Cancelada" : "Concluída"}`}
      close={close}
    >
      <div className="sale-detail-head">
        <div>
          <small>Cliente</small>
          <strong>Oficina São Lucas</strong>
        </div>
        <div>
          <small>Vendedor</small>
          <strong>Carlos Mendes</strong>
        </div>
        <div>
          <small>Pagamento</small>
          <strong>PIX</strong>
        </div>
        <div>
          <small>Valor líquido</small>
          <strong>R$ 398,20</strong>
        </div>
        <Status value={cancelled ? "Cancelada" : "Concluída"} />
      </div>
      <Tabs
        tabs={["Itens da venda", "Pagamentos", "Histórico", "Devoluções"]}
        value="Itens da venda"
        onChange={() => {}}
      />
      <DataTable
        headers={[
          "Código",
          "Produto",
          "Quantidade",
          "Preço referência",
          "Preço praticado",
          "Subtotal",
        ]}
      >
        <tr>
          <td>AG-00286</td>
          <td>Pastilha de freio dianteira</td>
          <td>2</td>
          <td>R$ 120,81</td>
          <td>R$ 115,00</td>
          <td>
            <strong>R$ 230,00</strong>
          </td>
        </tr>
        <tr>
          <td>AG-00891</td>
          <td>Fluido de freio DOT 4</td>
          <td>2</td>
          <td>R$ 84,10</td>
          <td>R$ 84,10</td>
          <td>
            <strong>R$ 168,20</strong>
          </td>
        </tr>
      </DataTable>
      <div className="dialog-footer spread">
        <div>
          <button className="secondary-button">
            <ReceiptText size={16} /> Imprimir comprovante
          </button>
          <button className="secondary-button">
            <History size={16} /> Histórico
          </button>
        </div>
        {!cancelled && (
          <div>
            <button className="secondary-button" onClick={() => setSub("return")}>
              <RotateCcw size={16} /> Registrar devolução
            </button>
            <button className="danger-button" onClick={() => setSub("cancel")}>
              <X size={16} /> Cancelar venda
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function ProductForm({ onSave, close }: { onSave: () => void; close: () => void }) {
  const [cost, setCost] = useState(35);
  const [margin, setMargin] = useState(40);
  const calculated = cost / (1 - margin / 100);
  return (
    <div className="form-stack">
      <h4 className="form-section-title">Identificação</h4>
      <div className="form-grid three">
        <Field label="Código interno">
          <input defaultValue="Automático" readOnly />
        </Field>
        <Field label="Código fabricante *">
          <input defaultValue="0261210170" />
        </Field>
        <Field label="EAN">
          <input placeholder="7890000000000" />
        </Field>
        <Field label="Descrição *" className="span-2">
          <input defaultValue="Sensor de rotação" />
        </Field>
        <Field label="Marca *">
          <select defaultValue="Bosch">
            <option>Bosch</option>
            <option>Tecfil</option>
            <option>NGK</option>
          </select>
        </Field>
        <Field label="Categoria">
          <select>
            <option>Injeção</option>
            <option>Motor</option>
          </select>
        </Field>
        <Field label="Unidade">
          <select>
            <option>UN — Unidade</option>
          </select>
        </Field>
        <Field label="Localização">
          <input defaultValue="C-04-02" />
        </Field>
      </div>
      <h4 className="form-section-title">Preço e estoque</h4>
      <div className="form-grid three">
        <Field label="Custo *">
          <div className="money-input">
            R$
            <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} />
          </div>
        </Field>
        <Field label="Margem manual *">
          <div className="money-input">
            <input
              type="number"
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
            />
            %
          </div>
        </Field>
        <Field label="Preço de referência calculado">
          <input value={money(calculated)} readOnly />
        </Field>
        <Field label="Estoque inicial">
          <input type="number" defaultValue="8" />
        </Field>
        <Field label="Estoque mínimo">
          <input type="number" defaultValue="4" />
        </Field>
        <Field label="Estoque máximo">
          <input type="number" defaultValue="20" />
        </Field>
      </div>
      <div className="formula-note">
        <BadgeDollarSign size={18} />
        <span>
          Preço = Custo ÷ (1 − Margem). Alterações futuras de custo não modificarão automaticamente
          o preço padrão.
        </span>
      </div>
      <div className="dialog-footer">
        <button className="secondary-button" onClick={close}>
          Cancelar
        </button>
        <Button onClick={onSave}>Salvar produto</Button>
      </div>
    </div>
  );
}

function PurchaseForm({ complete, close }: { complete: () => void; close: () => void }) {
  return (
    <div className="form-stack">
      <div className="form-grid three">
        <Field label="Fornecedor *">
          <select>
            <option>Distribuidora Paulista</option>
          </select>
        </Field>
        <Field label="Número do documento *">
          <input defaultValue="NF 000.184.222" />
        </Field>
        <Field label="Data da compra *">
          <input type="date" defaultValue="2025-05-22" />
        </Field>
      </div>
      <h4 className="form-section-title">Produtos da compra</h4>
      <div className="purchase-lines">
        <div className="purchase-head">
          <span>Produto</span>
          <span>Quantidade</span>
          <span>Custo unitário</span>
          <span>Subtotal</span>
          <span />
        </div>
        <div>
          <select>
            <option>AG-00124 — Filtro de óleo PSL55</option>
          </select>
          <input type="number" defaultValue="20" />
          <input defaultValue="R$ 18,50" />
          <strong>R$ 370,00</strong>
          <button>
            <Trash2 size={16} />
          </button>
        </div>
        <div>
          <select>
            <option>AG-00286 — Pastilha de freio dianteira</option>
          </select>
          <input type="number" defaultValue="10" />
          <input defaultValue="R$ 74,90" />
          <strong>R$ 749,00</strong>
          <button>
            <Trash2 size={16} />
          </button>
        </div>
        <button className="add-line">
          <Plus size={16} /> Adicionar produto
        </button>
      </div>
      <Field label="Observações">
        <textarea defaultValue="Entrega conferida no balcão. Documento sem divergências." />
      </Field>
      <div className="purchase-total">
        <span>Total da compra</span>
        <strong>R$ 1.119,00</strong>
      </div>
      <div className="dialog-footer">
        <button className="secondary-button" onClick={close}>
          Salvar rascunho
        </button>
        <Button icon={Check} onClick={complete}>
          Confirmar entrada
        </Button>
      </div>
    </div>
  );
}

function ReminderPopup({ close, notify }: { close: () => void; notify: (m: string) => void }) {
  return (
    <div className="reminder-popup">
      <button onClick={close}>
        <X size={17} />
      </button>
      <div className="popup-icon">
        <Bell size={20} />
      </div>
      <div>
        <span>LEMBRETE · 14:30</span>
        <h3>Retornar orçamento ao cliente</h3>
        <p>Ligar para o Auto Center Avenida e confirmar as condições do orçamento #ORC-1842.</p>
      </div>
      <div className="popup-actions">
        <button
          onClick={() => {
            notify("Lembrete concluído.");
            close();
          }}
        >
          <Check size={16} /> Concluir
        </button>
        <button
          onClick={() => {
            notify("Lembrete adiado por 30 minutos.");
            close();
          }}
        >
          Adiar 30 min
        </button>
        <button
          onClick={() => {
            notify("Lembrete adiado por 1 hora.");
            close();
          }}
        >
          Adiar 1 hora
        </button>
      </div>
      <button
        className="popup-cancel"
        onClick={() => {
          notify("Lembrete cancelado.");
          close();
        }}
      >
        Cancelar lembrete
      </button>
    </div>
  );
}

function Card({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
function Button({
  children,
  icon: Icon,
  onClick,
  full = false,
}: {
  children: React.ReactNode;
  icon?: typeof Plus;
  onClick?: () => void;
  full?: boolean;
}) {
  return (
    <button className={`primary-button ${full ? "full" : ""}`} onClick={onClick}>
      {Icon && <Icon size={17} />} {children}
    </button>
  );
}
function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function Status({ value }: { value: string }) {
  const danger = ["Cancelada", "Sem estoque", "Inativo"].includes(value);
  const warning = ["Em aberto", "Estoque baixo", "Pendente", "Parcial", "Em análise"].includes(
    value,
  );
  const neutral = ["Agendado", "Ativo", "Online"].includes(value);
  return (
    <span
      className={`status ${danger ? "danger" : warning ? "warning" : neutral ? "neutral" : "success"}`}
    >
      <i />
      {value}
    </span>
  );
}
function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={`${h}${i}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Pagination() {
  return (
    <div className="pagination">
      <span>Mostrando 1–10 de 1.842</span>
      <div>
        <button disabled>
          <ChevronRight size={16} className="flip" />
        </button>
        <button className="active">1</button>
        <button>2</button>
        <button>3</button>
        <span>…</span>
        <button>185</button>
        <button>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button className={value === t ? "active" : ""} key={t} onClick={() => onChange(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}
function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Package;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <div>
        <Icon size={27} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function InfoSection({ title, values }: { title: string; values: string[][] }) {
  return (
    <section className="info-section">
      <h3>{title}</h3>
      <div>
        {values.map(([a, b]) => (
          <label key={a}>
            <span>{a}</span>
            <strong>{b}</strong>
          </label>
        ))}
      </div>
    </section>
  );
}
function MiniStat({
  label,
  value,
  icon: Icon,
  tone = "",
}: {
  label: string;
  value: string;
  icon: typeof Package;
  tone?: string;
}) {
  return (
    <div className="mini-stat">
      <span className={tone}>
        <Icon size={20} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
function Dialog({
  title,
  subtitle,
  close,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  close: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="overlay">
      <section className={`dialog ${wide ? "wide" : ""}`}>
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button onClick={close}>
            <X size={21} />
          </button>
        </header>
        <div className="dialog-body">{children}</div>
      </section>
    </div>
  );
}

export default App;
