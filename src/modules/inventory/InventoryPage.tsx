import { useMemo, useState } from "react";
import { AlertCircle, Boxes, History, Package } from "lucide-react";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  MiniStat,
  Pagination,
  SearchInput,
  Select,
  Status,
  Tabs,
  usePagination,
} from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { ProductLink } from "../../components/shared/Links";
import { useDeny } from "../../components/shared/permissions";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { brandName, stockSituation } from "../../store/selectors";
import { matchesText } from "../../utils/calculations";
import { inRange, periodRange, type PeriodKey, periodLabels } from "../../utils/dates";
import { MovementTable, MOVEMENT_LABELS } from "./MovementTable";

const TABS = ["Posição de estoque", "Movimentações"] as const;
type Tab = (typeof TABS)[number];

export function InventoryPage() {
  const { state } = useStore();
  const { route, replace, open } = useNavigation();
  const deny = useDeny();
  const tab = (TABS.includes(route.tab as Tab) ? route.tab : TABS[0]) as Tab;
  const [query, setQuery] = useState(route.params?.query ?? "");
  const [situation, setSituation] = useState("all");
  const [movementType, setMovementType] = useState("all");
  const [period, setPeriod] = useState<PeriodKey>("30d");

  const active = state.products.filter((product) => product.active);
  const low = active.filter((product) => product.stock > 0 && product.stock <= product.min);
  const zero = active.filter((product) => product.stock <= 0);
  const todayMovements = state.movements.filter((movement) =>
    inRange(movement.at, periodRange("today")),
  );

  const products = useMemo(
    () =>
      state.products
        .filter((product) => product.active)
        .filter((product) =>
          matchesText(
            query,
            product.code,
            product.manufacturerCode,
            product.ean,
            product.name,
            product.location,
            brandName(state, product.brandId),
          ),
        )
        .filter((product) => situation === "all" || stockSituation(product) === situation)
        .sort((a, b) => a.stock - a.min - (b.stock - b.min)),
    [state, query, situation],
  );
  const pagination = usePagination(products, 10);
  const movements = useMemo(
    () =>
      state.movements
        .filter((movement) => movementType === "all" || movement.type === movementType)
        .filter((movement) => inRange(movement.at, periodRange(period)))
        .filter((movement) => {
          if (!query) return true;
          const product = state.products.find((item) => item.id === movement.productId);
          return matchesText(
            query,
            product?.code,
            product?.name,
            product?.manufacturerCode,
            movement.reason,
          );
        }),
    [state, movementType, period, query],
  );

  return (
    <>
      <PageHeader
        title="Estoque"
        subtitle="Saldos, localização e movimentações — toda alteração gera uma movimentação"
      />
      <div className="page-stack">
        <section className="mini-stats">
          <MiniStat label="Produtos ativos" value={String(active.length)} icon={Package} />
          <MiniStat
            label="Estoque baixo"
            value={`${low.length} produto(s)`}
            icon={AlertCircle}
            tone="warning"
            onClick={() => setSituation("Estoque baixo")}
          />
          <MiniStat
            label="Sem estoque"
            value={`${zero.length} produto(s)`}
            icon={Boxes}
            tone="danger"
            onClick={() => setSituation("Sem estoque")}
          />
          <MiniStat
            label="Movimentações hoje"
            value={String(todayMovements.length)}
            icon={History}
            onClick={() => replace({ ...route, tab: "Movimentações" })}
          />
        </section>
        <Card className="table-card">
          <Tabs tabs={TABS} value={tab} onChange={(next) => replace({ ...route, tab: next })} />
          <div className="filter-row">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Produto, código, EAN ou localização..."
            />
            {tab === "Posição de estoque" ? (
              <Select
                label="Situação"
                value={situation}
                onChange={setSituation}
                options={[
                  { value: "all", label: "Todas as situações" },
                  "Normal",
                  "Estoque baixo",
                  "Sem estoque",
                  "Acima do máximo",
                ]}
              />
            ) : (
              <>
                <Select
                  label="Tipo"
                  value={movementType}
                  onChange={setMovementType}
                  options={[
                    { value: "all", label: "Todos os tipos" },
                    ...Object.entries(MOVEMENT_LABELS).map(([value, label]) => ({ value, label })),
                  ]}
                />
                <Select
                  label="Período"
                  value={period}
                  onChange={setPeriod}
                  options={(Object.keys(periodLabels) as PeriodKey[]).map((value) => ({
                    value,
                    label: periodLabels[value],
                  }))}
                />
              </>
            )}
          </div>
          {tab === "Posição de estoque" ? (
            products.length === 0 ? (
              <EmptyState
                icon={Boxes}
                title="Nenhum produto encontrado"
                text="Ajuste a pesquisa ou a situação selecionada."
              />
            ) : (
              <>
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
                  {pagination.pageItems.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <ProductLink id={product.id} sub={brandName(state, product.brandId)} />
                      </td>
                      <td>{product.code}</td>
                      <td>
                        <strong>{product.stock} un.</strong>
                      </td>
                      <td>{product.min}</td>
                      <td>{product.max}</td>
                      <td>
                        <span className="location">{product.location || "—"}</span>
                      </td>
                      <td>
                        <Status value={stockSituation(product)} />
                      </td>
                      <td>
                        <div className="row-buttons">
                          <Button
                            small
                            variant="secondary"
                            onClick={() =>
                              replace({
                                page: "inventory",
                                tab: "Movimentações",
                                params: { query: product.code },
                              })
                            }
                          >
                            Movimentações
                          </Button>
                          <Button
                            small
                            variant="secondary"
                            onClick={() => open({ type: "stock-adjust", productId: product.id })}
                            disabledReason={deny("inventory.adjust")}
                          >
                            Ajustar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </DataTable>
                <Pagination {...pagination} />
              </>
            )
          ) : (
            <MovementTable key={`${query}-${movementType}-${period}`} movements={movements} />
          )}
        </Card>
      </div>
    </>
  );
}
