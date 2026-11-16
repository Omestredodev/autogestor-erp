import {
  Boxes,
  CalendarClock,
  Car,
  Package,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Trash2,
  Truck,
} from "lucide-react";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  InfoSection,
  Notice,
  Status,
  Tabs,
} from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { ProductLink, SaleLink, CustomerLink } from "../../components/shared/Links";
import { useCommand } from "../../components/shared/useCommand";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import {
  applicationsOf,
  brandName,
  byId,
  categoryName,
  equivalentsOf,
  productSaleLines,
  relatedAudit,
  stockSituation,
  supplierName,
  vehicleLabel,
} from "../../store/selectors";
import { MovementTable } from "../inventory/MovementTable";
import { AuditTable } from "../audit/AuditTable";
import { money, percent } from "../../utils/currency";
import { formatDate, formatDateTime } from "../../utils/dates";
import { EquivalenceManager } from "../equivalents/EquivalenceManager";
import { NO_PERMISSION } from "../../components/shared/permissions";

const TABS = [
  "Informações gerais",
  "Aplicações",
  "Equivalentes",
  "Estoque",
  "Preços",
  "Histórico de vendas",
  "Auditoria",
] as const;
type Tab = (typeof TABS)[number];

export function ProductDetail({ id }: { id: string }) {
  const { state, can } = useStore();
  const { route, replace, open } = useNavigation();
  const { execute } = useCommand();
  const product = byId(state.products, id);
  if (!product) {
    return (
      <>
        <PageHeader title="Produto não encontrado" backTo={{ page: "products" }} />
        <Card>
          <EmptyState
            icon={Package}
            title="Registro inexistente"
            text="O produto pode ter sido removido ao restaurar os dados de demonstração."
          />
        </Card>
      </>
    );
  }
  const tab = (TABS.includes(route.tab as Tab) ? route.tab : TABS[0]) as Tab;
  const applications = applicationsOf(state, id);
  const equivalents = equivalentsOf(state, id);
  const movements = state.movements.filter((movement) => movement.productId === id);
  const sales = productSaleLines(state, id);
  const purchaseLines = state.purchases
    .filter((purchase) => purchase.status === "confirmed")
    .flatMap((purchase) =>
      purchase.items.filter((item) => item.productId === id).map((item) => ({ purchase, item })),
    )
    .sort((a, b) => b.purchase.date.localeCompare(a.purchase.date));
  const situation = stockSituation(product);

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={`${product.code} · ${brandName(state, product.brandId)} · Cód. fabricante ${product.manufacturerCode}`}
        record={product.code}
        backTo={{ page: "products" }}
        actions={
          <>
            <Button
              variant="secondary"
              icon={CalendarClock}
              onClick={() => open({ type: "reminder-form", productId: id })}
              disabledReason={can("reminders.manage") ? undefined : NO_PERMISSION}
            >
              Lembrete
            </Button>
            <Button
              variant="secondary"
              icon={Power}
              onClick={() => execute({ type: "product.toggleActive", id })}
              disabledReason={can("products.manage") ? undefined : NO_PERMISSION}
            >
              {product.active ? "Inativar" : "Reativar"}
            </Button>
            <Button
              icon={Pencil}
              onClick={() => open({ type: "product-form", productId: id })}
              disabledReason={can("products.manage") ? undefined : NO_PERMISSION}
            >
              Editar produto
            </Button>
          </>
        }
      />
      <Card className="detail-card">
        <div className="product-hero">
          <div className="product-icon">
            <Package size={30} />
          </div>
          <div>
            <span className="status-row">
              <Status value={product.active ? "Ativo" : "Inativo"} />
              {product.active && situation !== "Normal" && <Status value={situation} />}
            </span>
            <h2>{product.name}</h2>
            <p>
              {categoryName(state, product.categoryId)} · EAN {product.ean || "—"} · OEM{" "}
              {product.oemCode || "—"}
            </p>
          </div>
          <div className="product-balance">
            <small>Estoque atual</small>
            <strong>
              {product.stock} {product.unit.toLowerCase()}.
            </strong>
            <span>
              mín. {product.min} · máx. {product.max}
            </span>
          </div>
        </div>
        <Tabs
          tabs={TABS}
          value={tab}
          onChange={(next) => replace({ ...route, tab: next })}
          counts={{
            Aplicações: applications.length,
            Equivalentes: equivalents.length,
            Estoque: movements.length,
            "Histórico de vendas": sales.length,
          }}
        />
        {tab === "Informações gerais" && (
          <div className="info-grid">
            <InfoSection
              title="Identificação"
              values={[
                ["Código interno", product.code],
                ["Código do fabricante", product.manufacturerCode],
                ["EAN", product.ean || "—"],
                ["Código OEM", product.oemCode || "—"],
                ["Descrição", product.name],
                ["Marca", brandName(state, product.brandId)],
                ["Categoria", categoryName(state, product.categoryId)],
                ["Unidade de medida", product.unit],
              ]}
            />
            <InfoSection
              title="Preço e margem"
              values={[
                ["Custo atual", money(product.cost)],
                ["Margem informada", percent(product.margin)],
                ["Preço de referência", money(product.price)],
                [
                  "Margem efetiva sobre o preço salvo",
                  product.price > 0 ? percent(1 - product.cost / product.price) : "—",
                ],
                ["Última atualização", formatDateTime(product.updatedAt)],
              ]}
            />
            <InfoSection
              title="Controle de estoque"
              values={[
                ["Estoque atual", `${product.stock} unidades`],
                ["Estoque mínimo", `${product.min} unidades`],
                ["Estoque máximo", `${product.max} unidades`],
                ["Localização física", product.location || "—"],
                ["Situação", situation],
              ]}
            />
            {product.notes && (
              <InfoSection title="Observações" values={[["Notas", product.notes]]} />
            )}
          </div>
        )}
        {tab === "Aplicações" && (
          <div className="tab-content">
            <Notice title="Dados demonstrativos">
              As compatibilidades abaixo são exemplos e devem ser verificadas tecnicamente antes do
              uso comercial.
            </Notice>
            <div className="tab-toolbar">
              <Button
                small
                icon={Plus}
                onClick={() => open({ type: "application-form", productId: id })}
                disabledReason={can("vehicles.manage") ? undefined : NO_PERMISSION}
              >
                Associar veículo
              </Button>
            </div>
            {applications.length === 0 ? (
              <EmptyState
                icon={Car}
                title="Nenhuma aplicação cadastrada"
                text="Associe veículos para que o produto apareça na busca por veículo."
              />
            ) : (
              <DataTable
                headers={["Fabricante", "Modelo", "Anos", "Motor", "Versão", "Observações", ""]}
              >
                {applications.map(({ application, vehicle }) => (
                  <tr key={application.id}>
                    <td>{vehicle.maker}</td>
                    <td>{vehicle.model}</td>
                    <td>
                      {vehicle.yearFrom}–{vehicle.yearTo}
                    </td>
                    <td>{vehicle.engine}</td>
                    <td>{vehicle.version}</td>
                    <td className="wrap-cell">{application.notes || vehicle.features}</td>
                    <td>
                      <Button
                        small
                        variant="secondary"
                        icon={Trash2}
                        onClick={() => execute({ type: "application.remove", id: application.id })}
                        disabledReason={can("vehicles.manage") ? undefined : NO_PERMISSION}
                      >
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>
        )}
        {tab === "Equivalentes" && (
          <div className="tab-content">
            <EquivalenceManager productId={id} />
          </div>
        )}
        {tab === "Estoque" && (
          <div className="tab-content">
            <div className="tab-toolbar">
              <Button
                small
                variant="secondary"
                icon={Truck}
                onClick={() => open({ type: "purchase-form", productId: id })}
                disabledReason={
                  can("purchases.manage")
                    ? product.active
                      ? undefined
                      : "Produto inativo"
                    : NO_PERMISSION
                }
              >
                Registrar compra
              </Button>
              <Button
                small
                icon={Boxes}
                onClick={() => open({ type: "stock-adjust", productId: id })}
                disabledReason={can("inventory.adjust") ? undefined : NO_PERMISSION}
              >
                Ajustar estoque
              </Button>
            </div>
            <MovementTable movements={movements} showProduct={false} />
          </div>
        )}
        {tab === "Preços" && (
          <div className="tab-content">
            <div className="mini-stats three">
              <div className="mini-stat">
                <div>
                  <small>Custo atual</small>
                  <strong>{money(product.cost)}</strong>
                </div>
              </div>
              <div className="mini-stat">
                <div>
                  <small>Margem informada</small>
                  <strong>{percent(product.margin)}</strong>
                </div>
              </div>
              <div className="mini-stat">
                <div>
                  <small>Preço de referência salvo</small>
                  <strong>{money(product.price)}</strong>
                </div>
              </div>
            </div>
            <h4 className="form-section-title">Custos registrados em compras</h4>
            {purchaseLines.length === 0 ? (
              <p className="muted-text">Nenhuma compra confirmada para este produto.</p>
            ) : (
              <DataTable headers={["Compra", "Fornecedor", "Data", "Quantidade", "Custo unitário"]}>
                {purchaseLines.map(({ purchase, item }) => (
                  <tr key={item.id}>
                    <td>{purchase.number}</td>
                    <td>{supplierName(state, purchase.supplierId)}</td>
                    <td>{formatDate(`${purchase.date}T12:00:00`)}</td>
                    <td>{item.quantity}</td>
                    <td>{money(item.unitCost)}</td>
                  </tr>
                ))}
              </DataTable>
            )}
            <h4 className="form-section-title">Preços praticados em vendas</h4>
            {sales.length === 0 ? (
              <p className="muted-text">Nenhuma venda registrada.</p>
            ) : (
              <DataTable
                headers={["Venda", "Data", "Preço de referência", "Preço praticado", "Diferença"]}
              >
                {sales.slice(0, 10).map(({ sale, item }) => (
                  <tr key={item.id}>
                    <td>
                      <SaleLink id={sale.id} />
                    </td>
                    <td>{formatDate(sale.at)}</td>
                    <td>{money(item.referencePrice)}</td>
                    <td>{money(item.price)}</td>
                    <td
                      className={
                        item.price < item.referencePrice
                          ? "qty-negative"
                          : item.price > item.referencePrice
                            ? "qty-positive"
                            : ""
                      }
                    >
                      {money(item.price - item.referencePrice)}
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>
        )}
        {tab === "Histórico de vendas" && (
          <div className="tab-content">
            {sales.length === 0 ? (
              <EmptyState
                icon={RefreshCw}
                title="Sem vendas registradas"
                text="As vendas deste produto aparecerão aqui."
              />
            ) : (
              <DataTable
                headers={[
                  "Venda",
                  "Cliente",
                  "Data",
                  "Quantidade",
                  "Devolvido",
                  "Preço praticado",
                  "Subtotal",
                  "Situação",
                ]}
              >
                {sales.map(({ sale, item, total, returned }) => (
                  <tr key={item.id}>
                    <td>
                      <SaleLink id={sale.id} />
                    </td>
                    <td>
                      <CustomerLink id={sale.customerId} />
                    </td>
                    <td>{formatDateTime(sale.at)}</td>
                    <td>{item.quantity}</td>
                    <td>{returned || "—"}</td>
                    <td>{money(item.price)}</td>
                    <td>{money(total)}</td>
                    <td>
                      <Status value={sale.status === "cancelled" ? "Cancelada" : "Concluída"} />
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>
        )}
        {tab === "Auditoria" && (
          <div className="tab-content">
            <AuditTable events={relatedAudit(state, id)} compact />
          </div>
        )}
      </Card>
      {tab === "Equivalentes" && equivalents.length > 0 && (
        <p className="footnote">
          Equivalências consultáveis nos dois sentidos — também visíveis a partir de{" "}
          {equivalents.map(({ product: other }) => other.code).join(", ")}.{" "}
          {equivalents[0] && (
            <ProductLink
              id={equivalents[0].product.id}
              label={`Abrir ${equivalents[0].product.code}`}
            />
          )}
        </p>
      )}
      {applications.length > 0 && tab === "Aplicações" && (
        <p className="footnote">
          {applications.length} veículo(s):{" "}
          {applications.map(({ vehicle }) => vehicleLabel(vehicle)).join(" | ")}
        </p>
      )}
    </>
  );
}
