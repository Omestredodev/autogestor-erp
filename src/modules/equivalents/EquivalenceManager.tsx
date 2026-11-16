import { useState } from "react";
import { Package, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button, DataTable, EmptyState, ErrorBanner, Field } from "../../components/ui";
import { ProductLink } from "../../components/shared/Links";
import { useCommand } from "../../components/shared/useCommand";
import { useDeny } from "../../components/shared/permissions";
import { useStore } from "../../store/AppProvider";
import { brandName, byId, equivalentsOf, userName } from "../../store/selectors";
import { money } from "../../utils/currency";
import { formatDateTime } from "../../utils/dates";

export function EquivalenceManager({ productId }: { productId: string }) {
  const { state } = useStore();
  const deny = useDeny();
  const { execute, busy, error } = useCommand();
  const [candidate, setCandidate] = useState("");
  const [notes, setNotes] = useState("");
  const product = byId(state.products, productId);
  if (!product) return null;
  const equivalents = equivalentsOf(state, productId);
  const linked = new Set(equivalents.map((entry) => entry.product.id));
  const options = state.products
    .filter((item) => item.id !== productId && !linked.has(item.id) && item.active)
    .sort((a, b) => a.code.localeCompare(b.code));
  const removed = state.equivalences.filter(
    (relation) =>
      !relation.active && (relation.productAId === productId || relation.productBId === productId),
  );
  const denied = deny("equivalents.manage");

  const add = () =>
    execute(
      { type: "equivalence.create", productAId: productId, productBId: candidate, notes },
      {
        onSuccess: () => {
          setCandidate("");
          setNotes("");
        },
      },
    );

  return (
    <div className="form-stack">
      <div className="selected-reference">
        <div className="product-icon">
          <Package size={24} />
        </div>
        <div>
          <small>
            {product.code} · {brandName(state, product.brandId).toUpperCase()}
          </small>
          <strong>{product.name}</strong>
          <span>
            Código do fabricante: {product.manufacturerCode} · {money(product.price)} ·{" "}
            {product.stock} un.
          </span>
        </div>
      </div>
      <ErrorBanner error={error} />
      <div className="inline-form">
        <Field label="Adicionar produto equivalente">
          <select
            value={candidate}
            onChange={(event) => setCandidate(event.target.value)}
            disabled={Boolean(denied)}
          >
            <option value="">Selecione um produto cadastrado</option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} — {item.name} ({brandName(state, item.brandId)} {item.manufacturerCode})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Observações">
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex.: verificar dimensões"
            disabled={Boolean(denied)}
          />
        </Field>
        <Button
          icon={Plus}
          onClick={add}
          loading={busy}
          disabledReason={denied ?? (candidate ? undefined : "Selecione um produto")}
        >
          Adicionar
        </Button>
      </div>
      {equivalents.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="Nenhuma equivalência ativa"
          text="Relacione produtos cadastrados que podem substituir este item."
        />
      ) : (
        <DataTable
          headers={[
            "Produto equivalente",
            "Código",
            "Fabricante",
            "Cód. fabricante",
            "Estoque",
            "Preço",
            "Observações",
            "",
          ]}
        >
          {equivalents.map(({ relation, product: other }) => (
            <tr key={relation.id}>
              <td>
                <ProductLink id={other.id} />
              </td>
              <td>{other.code}</td>
              <td>{brandName(state, other.brandId)}</td>
              <td>{other.manufacturerCode}</td>
              <td>{other.stock} un.</td>
              <td>{money(other.price)}</td>
              <td className="wrap-cell">{relation.notes || "—"}</td>
              <td>
                <Button
                  small
                  variant="secondary"
                  icon={Trash2}
                  onClick={() => execute({ type: "equivalence.remove", id: relation.id })}
                  disabledReason={denied}
                >
                  Remover
                </Button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
      {removed.length > 0 && (
        <details className="history-details">
          <summary>{removed.length} relação(ões) removida(s) — rastreabilidade</summary>
          <ul>
            {removed.map((relation) => {
              const otherId =
                relation.productAId === productId ? relation.productBId : relation.productAId;
              const other = byId(state.products, otherId);
              return (
                <li key={relation.id}>
                  {other?.code} — {other?.name} · criada em {formatDateTime(relation.createdAt)} por{" "}
                  {userName(state, relation.createdBy)} · removida em{" "}
                  {formatDateTime(relation.removedAt)} por {userName(state, relation.removedBy)}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
