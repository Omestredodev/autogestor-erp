import { useEffect, useRef, useState } from "react";
import { Car, LogIn, RotateCcw } from "lucide-react";
import { AppProvider, useStore } from "./store/AppProvider";
import { loadTheme, saveTheme } from "./store/persistence";
import { NavigationProvider, useNavigation } from "./app/navigation/NavigationProvider";
import { canAccessPage, pageLabel, type Overlay, type Route } from "./app/navigation/routes";
import { LayoutProvider, useLayout } from "./components/layout/LayoutContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { PageHeader } from "./components/layout/PageHeader";
import { ToastProvider, useToast } from "./components/shared/Toast";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { Button, Dialog, Notice, Restricted } from "./components/ui";
import { DashboardPage } from "./modules/dashboard/DashboardPage";
import { ProductsPage } from "./modules/products/ProductsPage";
import { ProductForm } from "./modules/products/ProductForm";
import { ApplicationsPage } from "./modules/vehicles/ApplicationsPage";
import { ApplicationForm } from "./modules/vehicles/ApplicationForm";
import { EquivalentsPage } from "./modules/equivalents/EquivalentsPage";
import { CustomersPage } from "./modules/customers/CustomersPage";
import { CustomerForm } from "./modules/customers/CustomerForm";
import { SuppliersPage } from "./modules/suppliers/SuppliersPage";
import { SupplierForm } from "./modules/suppliers/SupplierForm";
import { PurchasesPage } from "./modules/purchases/PurchasesPage";
import { PurchaseForm } from "./modules/purchases/PurchaseForm";
import { InventoryPage } from "./modules/inventory/InventoryPage";
import { StockAdjustDialog } from "./modules/inventory/StockAdjustDialog";
import { SalesPage } from "./modules/sales/SalesPage";
import { PosScreen } from "./modules/sales/PosScreen";
import { ReceiptDialog } from "./modules/sales/ReceiptDialog";
import { CancelDialog, PaymentDialog, ReturnDialog } from "./modules/sales/SaleDialogs";
import { ClosingsPage } from "./modules/closings/ClosingsPage";
import { FinancePage } from "./modules/finance/FinancePage";
import { RemindersPage } from "./modules/reminders/RemindersPage";
import { ReminderForm } from "./modules/reminders/ReminderForm";
import { ReminderNotifier } from "./modules/reminders/ReminderNotifier";
import { ReportsPage } from "./modules/reports/ReportsPage";
import { AdminPage } from "./modules/admin/AdminPage";
import { AuditPage } from "./modules/audit/AuditPage";
import { SettingsPage } from "./modules/settings/SettingsPage";

function PageRouter({ route }: { route: Route }) {
  switch (route.page) {
    case "dashboard":
      return <DashboardPage />;
    case "products":
      return <ProductsPage />;
    case "applications":
      return <ApplicationsPage />;
    case "equivalents":
      return <EquivalentsPage />;
    case "clients":
      return <CustomersPage />;
    case "suppliers":
      return <SuppliersPage />;
    case "purchases":
      return <PurchasesPage />;
    case "inventory":
      return <InventoryPage />;
    case "sales":
      return <SalesPage />;
    case "closings":
      return <ClosingsPage />;
    case "finance":
      return <FinancePage />;
    case "reminders":
      return <RemindersPage />;
    case "reports":
      return <ReportsPage />;
    case "admin":
      return <AdminPage />;
    case "audit":
      return <AuditPage />;
    case "settings":
      return <SettingsPage />;
  }
}

function ResetDialog({ close }: { close: () => void }) {
  const { resetDemo } = useStore();
  const { navigate } = useNavigation();
  const { notify } = useToast();
  const [confirm, setConfirm] = useState("");
  const confirmed = confirm.trim().toUpperCase() === "RESTAURAR";
  return (
    <Dialog
      title="Restaurar dados de demonstração"
      subtitle="Esta ação não pode ser desfeita"
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            icon={RotateCcw}
            disabledReason={confirmed ? undefined : "Digite RESTAURAR para confirmar"}
            onClick={() => {
              resetDemo();
              close();
              navigate({ page: "dashboard" });
              notify("Dados de demonstração restaurados ao estado inicial.");
            }}
          >
            Restaurar dados
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Notice title="Todos os registros locais serão substituídos" tone="danger">
          Produtos, vendas, compras, movimentações, pagamentos, lembretes e auditoria criados neste
          navegador voltarão ao conjunto inicial de demonstração.
        </Notice>
        <label className="field">
          <span>Digite RESTAURAR para confirmar</span>
          <input value={confirm} onChange={(event) => setConfirm(event.target.value)} autoFocus />
        </label>
      </div>
    </Dialog>
  );
}

function OverlayHost({ overlay, close }: { overlay: Overlay; close: () => void }) {
  switch (overlay.type) {
    case "pos":
      return <PosScreen customerId={overlay.customerId} close={close} />;
    case "product-form":
      return <ProductForm productId={overlay.productId} close={close} />;
    case "purchase-form":
      return (
        <PurchaseForm
          purchaseId={overlay.purchaseId}
          supplierId={overlay.supplierId}
          productId={overlay.productId}
          close={close}
        />
      );
    case "customer-form":
      return <CustomerForm customerId={overlay.customerId} close={close} />;
    case "supplier-form":
      return <SupplierForm supplierId={overlay.supplierId} close={close} />;
    case "reminder-form":
      return (
        <ReminderForm
          reminderId={overlay.reminderId}
          customerId={overlay.customerId}
          productId={overlay.productId}
          saleId={overlay.saleId}
          close={close}
        />
      );
    case "stock-adjust":
      return <StockAdjustDialog productId={overlay.productId} close={close} />;
    case "receipt":
      return <ReceiptDialog saleId={overlay.saleId} close={close} />;
    case "payment":
      return <PaymentDialog target={overlay.target} mode={overlay.mode} close={close} />;
    case "application-form":
      return (
        <ApplicationForm
          productId={overlay.productId}
          vehicleId={overlay.vehicleId}
          close={close}
        />
      );
    case "sale-return":
      return <ReturnDialog saleId={overlay.saleId} close={close} />;
    case "sale-cancel":
      return <CancelDialog saleId={overlay.saleId} close={close} />;
    case "reset-demo":
      return <ResetDialog close={close} />;
  }
}

function LoggedOut({ onLogin }: { onLogin: () => void }) {
  const { user, role } = useStore();
  return (
    <div className="logged-out">
      <div className="logged-out-card">
        <div className="brand-mark">
          <Car size={26} strokeWidth={2.4} />
        </div>
        <h1>Sessão encerrada</h1>
        <p>
          Ambiente demonstrativo sem autenticação real. Os dados continuam salvos neste navegador.
        </p>
        <Button icon={LogIn} onClick={onLogin}>
          Entrar como {user.name} ({role.name})
        </Button>
      </div>
    </div>
  );
}

function Shell() {
  const { can, loadStatus, storageAvailable } = useStore();
  const { route, overlay, close, navigate } = useNavigation();
  const { collapsed } = useLayout();
  const { notify } = useToast();
  const [dark, setDark] = useState(loadTheme);
  const [loggedOut, setLoggedOut] = useState(false);
  const announced = useRef(false);

  useEffect(() => saveTheme(dark), [dark]);
  useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    if (loadStatus === "invalid")
      notify(
        "Os dados locais estavam corrompidos e foram substituídos pelos dados de demonstração.",
        "error",
      );
    if (loadStatus === "outdated")
      notify("Os dados locais eram de uma versão anterior e foram reiniciados.", "info");
  }, [loadStatus, notify]);
  useEffect(() => {
    if (!storageAvailable)
      notify(
        "Não foi possível salvar no armazenamento local. Alterações podem ser perdidas ao recarregar.",
        "error",
      );
  }, [storageAvailable, notify]);
  useEffect(() => {
    document.title = `${pageLabel(route.page)} · AutoGestor`;
  }, [route.page]);

  if (loggedOut) {
    return (
      <div className={dark ? "app dark" : "app"}>
        <LoggedOut onLogin={() => setLoggedOut(false)} />
      </div>
    );
  }

  const allowed = canAccessPage(route.page, can);
  return (
    <div className={dark ? "app dark" : "app"}>
      <Sidebar />
      <div className={collapsed ? "shell shell-collapsed" : "shell"}>
        <Topbar dark={dark} onTheme={() => setDark(!dark)} onLogout={() => setLoggedOut(true)} />
        <main className="main">
          {allowed ? (
            <ErrorBoundary
              key={`${route.page}:${route.id ?? ""}:${JSON.stringify(route.params ?? {})}`}
              onReset={() => navigate({ page: "dashboard" })}
            >
              <PageRouter route={route} />
            </ErrorBoundary>
          ) : (
            <>
              <PageHeader title={pageLabel(route.page)} subtitle="Acesso restrito" />
              <Restricted
                message="Seu perfil atual não possui permissão para acessar este módulo."
                action={
                  <Button onClick={() => navigate({ page: "dashboard" })}>
                    Ir para o Dashboard
                  </Button>
                }
              />
            </>
          )}
        </main>
      </div>
      {overlay && (
        <ErrorBoundary key={JSON.stringify(overlay)} onReset={close}>
          <OverlayHost overlay={overlay} close={close} />
        </ErrorBoundary>
      )}
      <ReminderNotifier />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <NavigationProvider>
          <LayoutProvider>
            <Shell />
          </LayoutProvider>
        </NavigationProvider>
      </ToastProvider>
    </AppProvider>
  );
}
