import { useMemo, useState } from "react";
import { Check, ClipboardList, Pencil, Plus, Trash2, TrendingUp, Truck, Boxes } from "lucide-react";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  InfoSection,
  MiniStat,
  Pagination,
  SearchInput,
  Select,
  Status,
  usePagination,
} from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { ProductLink, RecordLink } from "../../components/shared/Links";
import { useCommand } from "../../components/shared/useCommand";
import { useDeny } from "../../components/shared/permissions";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId, supplierName, userName } from "../../store/selectors";
import { purchaseTotal } from "../../domain/services/inventory";
import { matchesText } from "../../utils/calculations";
import { money } from "../../utils/currency";
import { formatDate, formatDateTime, isSameMonth } from "../../utils/dates";
import { MovementTable } from "../inventory/MovementTable";

export const PURCHASE_STATUS = {
  draft: "Rascunho",
  confirmed: "Confirmada",
  discarded: "Descartada",
} as const;
const dateOnly = (value: string) => formatDate(`${value}T12:00:00`);

export function PurchasesPage() {
  const { route } = useNavigation();
  return route.id ? <PurchaseDetail id={route.id} /> : <PurchaseList />;
}

function PurchaseList() {
  const { state } = useStore();
  const { navigate, open } = useNavigation();
  const deny = useDeny();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [supplier, setSupplier] = useState("all");
  const now = new Date();
  const confirmedMonth = state.purchases.filter(
    (purchase) => purchase.status === "confirmed" && isSameMonth(`${purchase.date}T12:00:00`, now),
  );
  const drafts = state.purchases.filter((purchase) => purchase.status === "draft");
  const purchases = useMemo(
    () =>
      [...state.purchases]
        .filter((purchase) => status === "all" || purchase.status === status)
        .filter((purchase) => supplier === "all" || purchase.supplierId === supplier)
        .filter((purchase) =>
          matchesText(
            query,
            purchase.number,
            purchase.documentNumber,
            purchase.notes,
            supplierName(state, purchase.supplierId),
            ...purchase.items.map((item) => byId(state.products, item.productId)?.code),
          ),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state, query, status, supplier],
  );
  const pagination = usePagination(purchases, 10);

  return (
    <>
      <PageHeader
        title="Compras"
        subtitle="Entradas de mercadorias e atualização de custos"
        actions={
          <Button
            icon={Plus}
            onClick={() => open({ type: "purchase-form" })}
            disabledReason={deny("purchases.manage")}
          >
            Registrar compra
          </Button>
        }
      />
      <div className="page-stack">
        <section className="mini-stats">
          <MiniStat
            label="Compras confirmadas no mês"
            value={money(
              confirmedMonth.reduce((sum, purchase) => sum + purchaseTotal(purchase), 0),
            )}
            icon={Truck}
          />
          <MiniStat
            label="Rascunhos pendentes"
            value={`${drafts.length} documento(s)`}
            icon={ClipboardList}
            tone="warning"
            onClick={() => setStatus("draft")}
          />
          <MiniStat
            label="Unidades recebidas no mês"
            value={`${confirmedMonth.reduce((sum, purchase) => sum + purchase.items.reduce((total, item) => total + item.quantity, 0), 0)} un.`}
            icon={Boxes}
          />
          <MiniStat
            label="Fornecedores ativos"
            value={String(state.suppliers.filter((item) => item.active).length)}
            icon={TrendingUp}
          />
        </section>
        <Card
          className="table-card"
          title="Compras registradas"
          subtitle={`${purchases.length} documento(s)`}
        >
          <div className="filter-row">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Número, documento, fornecedor ou produto..."
            />
            <Select
              label="Fornecedor"
              value={supplier}
              onChange={setSupplier}
              options={[
                { value: "all", label: "Todos os fornecedores" },
                ...state.suppliers.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
            <Select
              label="Situação"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "Todas as situações" },
                { value: "draft", label: "Rascunho" },
                { value: "confirmed", label: "Confirmada" },
                { value: "discarded", label: "Descartada" },
              ]}
            />
          </div>
          {purchases.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Nenhuma compra encontrada"
              text="Registre uma compra ou ajuste os filtros."
            />
          ) : (
            <DataTable
              headers={[
                "Compra",
                "Documento",
                "Fornecedor",
                "Data",
                "Itens",
                "Valor total",
                "Situação",
              ]}
            >
              {pagination.pageItems.map((purchase) => (
                <tr key={purchase.id}>
                  <td>
                    <button
                      type="button"
                      className="table-link"
                      onClick={() => navigate({ page: "purchases", id: purchase.id })}
                    >
                      {purchase.number}
                    </button>
                  </td>
                  <td>{purchase.documentNumber}</td>
                  <td>
                    <RecordLink route={{ page: "suppliers", id: purchase.supplierId }}>
                      {supplierName(state, purchase.supplierId)}
                    </RecordLink>
                  </td>
                  <td>{dateOnly(purchase.date)}</td>
                  <td>{purchase.items.length}</td>
                  <td>
                    <strong>{money(purchaseTotal(purchase))}</strong>
                  </td>
                  <td>
                    <Status value={PURCHASE_STATUS[purchase.status]} />
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
          <Pagination {...pagination} />
        </Card>
      </div>
    </>
  );
}

function PurchaseDetail({ id }: { id: string }) {
  const { state } = useStore();
  const { open } = useNavigation();
  const deny = useDeny();
  const { execute, busy } = useCommand();
  const purchase = byId(state.purchases, id);
  if (!purchase) {
    return (
      <>
        <PageHeader title="Compra não encontrada" backTo={{ page: "purchases" }} />
        <Card>
          <EmptyState
            icon={Truck}
            title="Registro inexistente"
            text="Esta compra não existe nos dados atuais."
          />
        </Card>
      </>
    );
  }
  const movements = state.movements.filter(
    (movement) => movement.refType === "purchase" && movement.refId === id,
  );
  return (
    <>
      <PageHeader
        title={`Compra ${purchase.number}`}
        subtitle={`Doc. ${purchase.documentNumber} · ${supplierName(state, purchase.supplierId)}`}
        record={purchase.number}
        backTo={{ page: "purchases" }}
        actions={
          purchase.status === "draft" && (
            <>
              <Button
                variant="secondary"
                icon={Trash2}
                onClick={() => execute({ type: "purchase.discard", id })}
                disabledReason={deny("purchases.manage")}
              >
                Descartar
              </Button>
              <Button
                variant="secondary"
                icon={Pencil}
                onClick={() => open({ type: "purchase-form", purchaseId: id })}
                disabledReason={deny("purchases.manage")}
              >
                Editar rascunho
              </Button>
              <Button
                variant="success"
                icon={Check}
                loading={busy}
                onClick={() => execute({ type: "purchase.confirm", id })}
                disabledReason={deny("purchases.manage")}
              >
                Confirmar entrada
              </Button>
            </>
          )
        }
      />
      <div className="page-stack">
        <div className="info-grid no-pad">
          <InfoSection
            title="Dados da compra"
            values={[
              ["Situação", <Status key="s" value={PURCHASE_STATUS[purchase.status]} />],
              [
                "Fornecedor",
                <RecordLink key="f" route={{ page: "suppliers", id: purchase.supplierId }}>
                  {supplierName(state, purchase.supplierId)}
                </RecordLink>,
              ],
              ["Documento", purchase.documentNumber],
              ["Data", dateOnly(purchase.date)],
              ["Atualiza custo", purchase.updateCost ? "Sim (preço preservado)" : "Não"],
            ]}
          />
          <InfoSection
            title="Registro"
            values={[
              ["Registrada em", formatDateTime(purchase.createdAt)],
              ["Registrada por", userName(state, purchase.createdBy)],
              ["Confirmada em", purchase.confirmedAt ? formatDateTime(purchase.confirmedAt) : "—"],
              [
                "Confirmada por",
                purchase.confirmedBy ? userName(state, purchase.confirmedBy) : "—",
              ],
              ["Total", money(purchaseTotal(purchase))],
            ]}
          />
        </div>
        {purchase.notes && <p className="muted-text">Observações: {purchase.notes}</p>}
        <Card title="Produtos" subtitle={`${purchase.items.length} item(ns)`}>
          <DataTable headers={["Produto", "Código", "Quantidade", "Custo unitário", "Subtotal"]}>
            {purchase.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <ProductLink id={item.productId} />
                </td>
                <td>{byId(state.products, item.productId)?.code}</td>
                <td>{item.quantity}</td>
                <td>{money(item.unitCost)}</td>
                <td>
                  <strong>{money(item.quantity * item.unitCost)}</strong>
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>
        <Card
          title="Movimentações de estoque geradas"
          subtitle={
            purchase.status === "confirmed"
              ? "Entradas registradas na confirmação"
              : "Nenhuma entrada até a confirmação"
          }
        >
          <MovementTable movements={movements} />
        </Card>
      </div>
    </>
  );
}
