import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Card,
  DataTable,
  EmptyState,
  Notice,
  Pagination,
  SearchInput,
  usePagination,
} from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { ProductLink } from "../../components/shared/Links";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { brandName, byId, equivalentsOf, userName } from "../../store/selectors";
import { matchesText } from "../../utils/calculations";
import { formatDate } from "../../utils/dates";
import { EquivalenceManager } from "./EquivalenceManager";

export function EquivalentsPage() {
  const { state, can } = useStore();
  const { route, replace } = useNavigation();
  const [query, setQuery] = useState("");
  const selected =
    route.params?.productId ??
    state.products.find((product) => product.code === "AG-00124")?.id ??
    state.products[0]?.id;
  const candidates = useMemo(
    () =>
      state.products
        .filter((product) =>
          matchesText(
            query,
            product.code,
            product.manufacturerCode,
            product.ean,
            product.name,
            brandName(state, product.brandId),
          ),
        )
        .slice(0, 8),
    [state, query],
  );
  const relations = state.equivalences
    .filter((relation) => relation.active)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pagination = usePagination(relations, 8);

  return (
    <>
      <PageHeader
        title="Equivalências"
        subtitle="Relações entre produtos cadastrados, consultáveis nos dois sentidos"
      />
      {!can("equivalents.manage") && (
        <Notice title="Somente consulta">
          Seu perfil pode consultar, mas não alterar equivalências.
        </Notice>
      )}
      <div className="two-column equivalents-layout">
        <Card
          title="Produto de referência"
          subtitle="Pesquise por código, fabricante, EAN ou descrição"
        >
          <div className="card-pad">
            <SearchInput value={query} onChange={setQuery} placeholder="Pesquisar produto..." />
            <div className="pick-list">
              {candidates.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  className={product.id === selected ? "active" : ""}
                  onClick={() => replace({ ...route, params: { productId: product.id } })}
                >
                  <div>
                    <small>
                      {product.code} · {brandName(state, product.brandId)}
                    </small>
                    <strong>{product.name}</strong>
                  </div>
                  <span className="count-pill">{equivalentsOf(state, product.id).length}</span>
                </button>
              ))}
              {candidates.length === 0 && <p className="muted-text">Nenhum produto encontrado.</p>}
            </div>
          </div>
        </Card>
        <Card
          title="Produtos equivalentes"
          subtitle="Alterações imediatas, sem fluxo de aprovação, registradas na auditoria"
        >
          <div className="card-pad">
            {selected ? (
              <EquivalenceManager productId={selected} />
            ) : (
              <EmptyState
                icon={RefreshCw}
                title="Selecione um produto"
                text="Escolha o produto de referência."
              />
            )}
          </div>
        </Card>
      </div>
      <Card
        title="Relações ativas"
        subtitle={`${relations.length} equivalências cadastradas`}
        className="table-card spaced"
      >
        {relations.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="Nenhuma equivalência"
            text="As relações criadas aparecerão aqui."
          />
        ) : (
          <DataTable headers={["Produto A", "Produto B", "Observações", "Criada em", "Por"]}>
            {pagination.pageItems.map((relation) => (
              <tr key={relation.id}>
                <td>
                  <ProductLink
                    id={relation.productAId}
                    sub={byId(state.products, relation.productAId)?.code}
                  />
                </td>
                <td>
                  <ProductLink
                    id={relation.productBId}
                    sub={byId(state.products, relation.productBId)?.code}
                  />
                </td>
                <td className="wrap-cell">{relation.notes || "—"}</td>
                <td>{formatDate(relation.createdAt)}</td>
                <td>{userName(state, relation.createdBy)}</td>
              </tr>
            ))}
          </DataTable>
        )}
        <Pagination {...pagination} />
      </Card>
    </>
  );
}
