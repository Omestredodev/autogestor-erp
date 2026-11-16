import { useMemo, useState } from "react";
import { Car, Package, Plus, RotateCcw, Search } from "lucide-react";
import { Button, Card, DataTable, EmptyState, Field, Notice, Status } from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { ProductLink } from "../../components/shared/Links";
import { useDeny } from "../../components/shared/permissions";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { applicationsOf, brandName, stockSituation, vehicleLabel } from "../../store/selectors";
import { matchesText } from "../../utils/calculations";
import { money } from "../../utils/currency";
import {
  emptyVehicleFilter,
  updateFilter,
  vehicleOptions,
  type VehicleFilter,
} from "./vehicleFilters";

export function ApplicationsPage() {
  const { state } = useStore();
  const { open, navigate } = useNavigation();
  const deny = useDeny();
  const [filter, setFilter] = useState<VehicleFilter>(emptyVehicleFilter);
  const [features, setFeatures] = useState("");
  const [searched, setSearched] = useState<VehicleFilter | null>(null);
  const [productLookup, setProductLookup] = useState("");
  const options = vehicleOptions(state.vehicles, filter);
  const set = (key: keyof VehicleFilter) => (event: { target: { value: string } }) => {
    setFilter(updateFilter(filter, key, event.target.value));
    setSearched(null);
  };

  const results = useMemo(() => {
    if (!searched) return [];
    const vehicles = vehicleOptions(state.vehicles, searched).matches.filter((vehicle) =>
      matchesText(features, vehicle.features, vehicle.version, vehicle.engine),
    );
    const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
    const map = new Map<string, { productId: string; vehicles: string[] }>();
    for (const application of state.applications.filter(
      (item) => item.active && vehicleIds.has(item.vehicleId),
    )) {
      const vehicle = vehicles.find((item) => item.id === application.vehicleId)!;
      const entry = map.get(application.productId) ?? {
        productId: application.productId,
        vehicles: [],
      };
      entry.vehicles.push(vehicleLabel(vehicle));
      map.set(application.productId, entry);
    }
    return [...map.values()]
      .map((entry) => ({
        ...entry,
        product: state.products.find((product) => product.id === entry.productId)!,
      }))
      .filter((entry) => entry.product);
  }, [searched, features, state]);

  const lookupProduct = state.products.find((product) => product.id === productLookup);
  const matchedVehicles = searched ? vehicleOptions(state.vehicles, searched).matches : [];

  return (
    <>
      <PageHeader
        title="Aplicações Automotivas"
        subtitle="Encontre peças compatíveis por veículo"
        actions={
          <Button
            icon={Plus}
            onClick={() =>
              open({
                type: "application-form",
                vehicleId: matchedVehicles.length === 1 ? matchedVehicles[0].id : undefined,
              })
            }
            disabledReason={deny("vehicles.manage")}
          >
            Associar produto a veículo
          </Button>
        }
      />
      <div className="page-stack">
        <Notice title="Ambiente demonstrativo">
          As aplicações exibidas são exemplos fictícios e não representam compatibilidade
          tecnicamente verificada.
        </Notice>
        <Card
          title="Localizar peças por veículo"
          subtitle="Os filtros são dependentes: Fabricante → Modelo → Ano → Motor → Versão"
        >
          <div className="vehicle-filters">
            <Field label="Fabricante">
              <select value={filter.maker} onChange={set("maker")}>
                <option value="">Selecione</option>
                {options.makers.map((maker) => (
                  <option key={maker}>{maker}</option>
                ))}
              </select>
            </Field>
            <Field label="Modelo">
              <select value={filter.model} onChange={set("model")} disabled={!filter.maker}>
                <option value="">{filter.maker ? "Todos" : "Selecione o fabricante"}</option>
                {options.models.map((model) => (
                  <option key={model}>{model}</option>
                ))}
              </select>
            </Field>
            <Field label="Ano">
              <select value={filter.year} onChange={set("year")} disabled={!filter.model}>
                <option value="">Todos</option>
                {options.years.map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
            </Field>
            <Field label="Motor">
              <select value={filter.engine} onChange={set("engine")} disabled={!filter.model}>
                <option value="">Todos</option>
                {options.engines.map((engine) => (
                  <option key={engine}>{engine}</option>
                ))}
              </select>
            </Field>
            <Field label="Versão">
              <select value={filter.version} onChange={set("version")} disabled={!filter.model}>
                <option value="">Todas</option>
                {options.versions.map((version) => (
                  <option key={version}>{version}</option>
                ))}
              </select>
            </Field>
            <Field label="Características adicionais">
              <input
                value={features}
                onChange={(event) => setFeatures(event.target.value)}
                placeholder="Ex.: turbo, automático"
              />
            </Field>
            <div className="filter-buttons">
              <Button
                icon={Search}
                onClick={() => setSearched(filter)}
                disabledReason={filter.maker ? undefined : "Selecione ao menos o fabricante"}
              >
                Buscar peças
              </Button>
              <Button
                variant="secondary"
                icon={RotateCcw}
                onClick={() => {
                  setFilter(emptyVehicleFilter);
                  setFeatures("");
                  setSearched(null);
                }}
              >
                Limpar
              </Button>
            </div>
          </div>
        </Card>
        {searched ? (
          <Card
            title="Produtos compatíveis (demonstrativo)"
            subtitle={`${[searched.maker, searched.model, searched.year, searched.engine, searched.version].filter(Boolean).join(" · ")} — ${matchedVehicles.length} configuração(ões) de veículo`}
          >
            {results.length === 0 ? (
              <EmptyState
                icon={Car}
                title="Nenhuma aplicação cadastrada para este veículo"
                text="Associe produtos a esta configuração para que apareçam nesta busca."
              />
            ) : (
              <div className="product-results">
                {results.map(({ product, vehicles }) => (
                  <div key={product.id}>
                    <div className="mini-product">
                      <Package size={22} />
                    </div>
                    <div>
                      <small>
                        {product.code} · {brandName(state, product.brandId)} ·{" "}
                        {product.manufacturerCode}
                      </small>
                      <strong>{product.name}</strong>
                      <span>{vehicles.join(" | ")}</span>
                    </div>
                    <div className="result-meta">
                      <strong>{money(product.price)}</strong>
                      <span>{product.stock} em estoque</span>
                      {!product.active ? (
                        <Status value="Inativo" />
                      ) : (
                        stockSituation(product) !== "Normal" && (
                          <Status value={stockSituation(product)} />
                        )
                      )}
                    </div>
                    <Button
                      small
                      variant="secondary"
                      onClick={() =>
                        navigate({ page: "products", id: product.id, tab: "Aplicações" })
                      }
                    >
                      Ver produto
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={Car}
              title="Selecione um veículo"
              text="Os produtos com aplicações associadas aparecerão aqui após a busca."
            />
          </Card>
        )}
        <Card
          title="Aplicações de um produto"
          subtitle="Consulte todos os veículos associados a um produto"
        >
          <div className="card-pad form-stack">
            <Field label="Produto">
              <select
                value={productLookup}
                onChange={(event) => setProductLookup(event.target.value)}
              >
                <option value="">Selecione um produto</option>
                {state.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code} — {product.name}
                  </option>
                ))}
              </select>
            </Field>
            {lookupProduct &&
              (applicationsOf(state, lookupProduct.id).length === 0 ? (
                <p className="muted-text">
                  Nenhuma aplicação cadastrada para {lookupProduct.code}.
                </p>
              ) : (
                <DataTable headers={["Veículo", "Características", "Observações"]}>
                  {applicationsOf(state, lookupProduct.id).map(({ application, vehicle }) => (
                    <tr key={application.id}>
                      <td>{vehicleLabel(vehicle)}</td>
                      <td>{vehicle.features}</td>
                      <td className="wrap-cell">{application.notes || "—"}</td>
                    </tr>
                  ))}
                </DataTable>
              ))}
            {lookupProduct && (
              <ProductLink
                id={lookupProduct.id}
                label={`Abrir ${lookupProduct.code} na aba Aplicações`}
              />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
