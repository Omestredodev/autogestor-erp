import { useMemo, useState } from "react";
import { Boxes, Eye, Package, Pencil, Plus, Power, Truck } from "lucide-react";
import {
  ActionMenu,
  Button,
  Card,
  DataTable,
  EmptyState,
  Pagination,
  SearchInput,
  Select,
  Status,
  usePagination,
} from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { useCommand } from "../../components/shared/useCommand";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { brandName, categoryName, stockSituation, vehicleLabel } from "../../store/selectors";
import { matchesText } from "../../utils/calculations";
import { money, percent } from "../../utils/currency";
import { ProductDetail } from "./ProductDetail";
import { NO_PERMISSION } from "../../components/shared/permissions";

export function ProductsPage() {
  const { route } = useNavigation();
  return route.id ? <ProductDetail id={route.id} /> : <ProductList />;
}

function ProductList() {
  const { state, can } = useStore();
  const { navigate, open } = useNavigation();
  const { execute } = useCommand();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState("all");
  const [situation, setSituation] = useState("all");
  const [status, setStatus] = useState("active");

  const vehicleText = useMemo(() => {
    const map = new Map<string, string>();
    for (const application of state.applications.filter((item) => item.active)) {
      const vehicle = state.vehicles.find((item) => item.id === application.vehicleId);
      if (vehicle)
        map.set(
          application.productId,
          `${map.get(application.productId) ?? ""} ${vehicleLabel(vehicle)}`,
        );
    }
    return map;
  }, [state.applications, state.vehicles]);

  const filtered = useMemo(
    () =>
      state.products
        .filter((product) =>
          matchesText(
            query,
            product.code,
            product.manufacturerCode,
            product.ean,
            product.oemCode,
            product.name,
            brandName(state, product.brandId),
            categoryName(state, product.categoryId),
            vehicleText.get(product.id),
          ),
        )
        .filter((product) => brand === "all" || product.brandId === brand)
        .filter((product) => category === "all" || product.categoryId === category)
        .filter((product) => situation === "all" || stockSituation(product) === situation)
        .filter(
          (product) => status === "all" || (status === "active" ? product.active : !product.active),
        )
        .sort((a, b) => a.code.localeCompare(b.code)),
    [state, query, brand, category, situation, status, vehicleText],
  );
  const pagination = usePagination(filtered, 10);

  return (
    <>
      <PageHeader
        title="Produtos"
        subtitle="Catálogo, preços, aplicações e disponibilidade"
        actions={
          <Button
            icon={Plus}
            onClick={() => open({ type: "product-form" })}
            disabledReason={can("products.manage") ? undefined : NO_PERMISSION}
          >
            Novo produto
          </Button>
        }
      />
      <Card className="table-card">
        <div className="filter-row">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Código interno, fabricante, EAN, OEM, descrição, marca ou veículo..."
          />
          <Select
            label="Marca"
            value={brand}
            onChange={setBrand}
            options={[
              { value: "all", label: "Todas as marcas" },
              ...state.brands.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
          <Select
            label="Categoria"
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: "Todas as categorias" },
              ...state.categories.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
          <Select
            label="Situação do estoque"
            value={situation}
            onChange={setSituation}
            options={[
              { value: "all", label: "Qualquer estoque" },
              "Normal",
              "Estoque baixo",
              "Sem estoque",
              "Acima do máximo",
            ]}
          />
          <Select
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "Ativos" },
              { value: "inactive", label: "Inativos" },
              { value: "all", label: "Todos" },
            ]}
          />
        </div>
        <div className="result-count">
          <strong>{filtered.length} produtos</strong>
          <span>
            Valor em estoque (custo):{" "}
            {money(filtered.reduce((total, product) => total + product.cost * product.stock, 0))}
          </span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum produto encontrado"
            text="Tente alterar os termos ou remover um filtro."
          />
        ) : (
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
            {pagination.pageItems.map((product) => (
              <tr key={product.id} className={product.active ? "" : "row-inactive"}>
                <td>
                  <button
                    type="button"
                    className="table-link"
                    onClick={() => navigate({ page: "products", id: product.id })}
                  >
                    {product.code}
                  </button>
                  <small>{product.manufacturerCode}</small>
                </td>
                <td>
                  <strong>{product.name}</strong>
                  <small>{categoryName(state, product.categoryId)}</small>
                </td>
                <td>{brandName(state, product.brandId)}</td>
                <td>{money(product.cost)}</td>
                <td>{percent(product.margin)}</td>
                <td>
                  <strong>{money(product.price)}</strong>
                </td>
                <td>
                  <strong>
                    {product.stock} {product.unit.toLowerCase()}.
                  </strong>
                  <small>Mín. {product.min}</small>
                </td>
                <td>
                  {product.active ? (
                    <Status
                      value={
                        stockSituation(product) === "Normal"
                          ? "Disponível"
                          : stockSituation(product)
                      }
                    />
                  ) : (
                    <Status value="Inativo" />
                  )}
                </td>
                <td>
                  <ActionMenu
                    items={[
                      {
                        label: "Ver detalhes",
                        icon: Eye,
                        onClick: () => navigate({ page: "products", id: product.id }),
                      },
                      {
                        label: "Editar",
                        icon: Pencil,
                        onClick: () => open({ type: "product-form", productId: product.id }),
                        disabledReason: can("products.manage") ? undefined : NO_PERMISSION,
                      },
                      {
                        label: "Ajustar estoque",
                        icon: Boxes,
                        onClick: () => open({ type: "stock-adjust", productId: product.id }),
                        disabledReason: can("inventory.adjust") ? undefined : NO_PERMISSION,
                      },
                      {
                        label: "Registrar compra",
                        icon: Truck,
                        onClick: () => open({ type: "purchase-form", productId: product.id }),
                        hidden: !can("purchases.manage") || !product.active,
                      },
                      {
                        label: product.active ? "Inativar" : "Reativar",
                        icon: Power,
                        danger: product.active,
                        onClick: () => execute({ type: "product.toggleActive", id: product.id }),
                        disabledReason: can("products.manage") ? undefined : NO_PERMISSION,
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        )}
        <Pagination {...pagination} />
      </Card>
    </>
  );
}
