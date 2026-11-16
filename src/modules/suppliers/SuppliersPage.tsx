import { useMemo, useState } from "react";
import { Building2, Eye, Pencil, Plus, Power, Truck } from "lucide-react";
import {
  ActionMenu,
  Button,
  Card,
  DataTable,
  EmptyState,
  InfoSection,
  Pagination,
  SearchInput,
  Select,
  Status,
  usePagination,
} from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { useCommand } from "../../components/shared/useCommand";
import { useDeny } from "../../components/shared/permissions";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId } from "../../store/selectors";
import { purchaseTotal } from "../../domain/services/inventory";
import { matchesText } from "../../utils/calculations";
import { money } from "../../utils/currency";
import { formatDate, formatDateTime, isSameMonth } from "../../utils/dates";
import { PURCHASE_STATUS } from "../purchases/PurchasesPage";

export function SuppliersPage() {
  const { route } = useNavigation();
  return route.id ? <SupplierDetail id={route.id} /> : <SupplierList />;
}

function SupplierList() {
  const { state } = useStore();
  const { navigate, open } = useNavigation();
  const { execute } = useCommand();
  const deny = useDeny();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const suppliers = useMemo(
    () =>
      state.suppliers
        .filter((supplier) =>
          matchesText(
            query,
            supplier.name,
            supplier.document,
            supplier.city,
            supplier.contact,
            supplier.email,
          ),
        )
        .filter(
          (supplier) =>
            status === "all" || (status === "active" ? supplier.active : !supplier.active),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state.suppliers, query, status],
  );
  const pagination = usePagination(suppliers, 10);
  const monthTotal = (supplierId: string) =>
    state.purchases
      .filter(
        (purchase) =>
          purchase.supplierId === supplierId &&
          purchase.status === "confirmed" &&
          isSameMonth(`${purchase.date}T12:00:00`, new Date()),
      )
      .reduce((sum, purchase) => sum + purchaseTotal(purchase), 0);

  return (
    <>
      <PageHeader
        title="Fornecedores"
        subtitle="Parceiros comerciais e condições de compra"
        actions={
          <Button
            icon={Plus}
            onClick={() => open({ type: "supplier-form" })}
            disabledReason={deny("suppliers.manage")}
          >
            Novo fornecedor
          </Button>
        }
      />
      <Card
        className="table-card"
        title="Fornecedores"
        subtitle={`${suppliers.length} registro(s)`}
      >
        <div className="filter-row">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Razão social, CNPJ, cidade ou contato..."
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
        {suppliers.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhum fornecedor encontrado"
            text="Ajuste a pesquisa ou cadastre um fornecedor."
          />
        ) : (
          <DataTable
            headers={[
              "Fornecedor",
              "CNPJ",
              "Localização",
              "Condição",
              "Compras no mês",
              "Status",
              "",
            ]}
          >
            {pagination.pageItems.map((supplier) => (
              <tr key={supplier.id}>
                <td>
                  <button
                    type="button"
                    className="table-link"
                    onClick={() => navigate({ page: "suppliers", id: supplier.id })}
                  >
                    {supplier.name}
                  </button>
                  <small>{supplier.contact || supplier.email}</small>
                </td>
                <td>{supplier.document}</td>
                <td>{supplier.city}</td>
                <td>{supplier.paymentTerms}</td>
                <td>{money(monthTotal(supplier.id))}</td>
                <td>
                  <Status value={supplier.active ? "Ativo" : "Inativo"} />
                </td>
                <td>
                  <ActionMenu
                    items={[
                      {
                        label: "Ver detalhes",
                        icon: Eye,
                        onClick: () => navigate({ page: "suppliers", id: supplier.id }),
                      },
                      {
                        label: "Editar",
                        icon: Pencil,
                        onClick: () => open({ type: "supplier-form", supplierId: supplier.id }),
                        disabledReason: deny("suppliers.manage"),
                      },
                      {
                        label: "Registrar compra",
                        icon: Truck,
                        onClick: () => open({ type: "purchase-form", supplierId: supplier.id }),
                        disabledReason:
                          deny("purchases.manage") ??
                          (supplier.active ? undefined : "Fornecedor inativo"),
                      },
                      {
                        label: supplier.active ? "Inativar" : "Reativar",
                        icon: Power,
                        danger: supplier.active,
                        onClick: () => execute({ type: "supplier.toggleActive", id: supplier.id }),
                        disabledReason: deny("suppliers.manage"),
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

function SupplierDetail({ id }: { id: string }) {
  const { state } = useStore();
  const { navigate, open } = useNavigation();
  const { execute } = useCommand();
  const deny = useDeny();
  const supplier = byId(state.suppliers, id);
  if (!supplier) {
    return (
      <>
        <PageHeader title="Fornecedor não encontrado" backTo={{ page: "suppliers" }} />
        <Card>
          <EmptyState
            icon={Building2}
            title="Registro inexistente"
            text="Este fornecedor não existe nos dados atuais."
          />
        </Card>
      </>
    );
  }
  const purchases = state.purchases
    .filter((purchase) => purchase.supplierId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const confirmed = purchases.filter((purchase) => purchase.status === "confirmed");
  return (
    <>
      <PageHeader
        title={supplier.name}
        subtitle={`${supplier.document} · ${supplier.city}`}
        record={supplier.name}
        backTo={{ page: "suppliers" }}
        actions={
          <>
            <Button
              variant="secondary"
              icon={Power}
              onClick={() => execute({ type: "supplier.toggleActive", id })}
              disabledReason={deny("suppliers.manage")}
            >
              {supplier.active ? "Inativar" : "Reativar"}
            </Button>
            <Button
              variant="secondary"
              icon={Pencil}
              onClick={() => open({ type: "supplier-form", supplierId: id })}
              disabledReason={deny("suppliers.manage")}
            >
              Editar
            </Button>
            <Button
              icon={Truck}
              onClick={() => open({ type: "purchase-form", supplierId: id })}
              disabledReason={
                deny("purchases.manage") ?? (supplier.active ? undefined : "Fornecedor inativo")
              }
            >
              Registrar compra
            </Button>
          </>
        }
      />
      <div className="page-stack">
        <div className="info-grid no-pad">
          <InfoSection
            title="Dados cadastrais"
            values={[
              ["Razão social", supplier.name],
              ["CNPJ", supplier.document],
              ["Telefone", supplier.phone || "—"],
              ["E-mail", supplier.email || "—"],
              ["Cidade/UF", supplier.city || "—"],
              ["Contato", supplier.contact || "—"],
            ]}
          />
          <InfoSection
            title="Relacionamento"
            values={[
              ["Status", <Status key="s" value={supplier.active ? "Ativo" : "Inativo"} />],
              ["Condição de pagamento", supplier.paymentTerms],
              ["Compras confirmadas", String(confirmed.length)],
              [
                "Total comprado",
                money(confirmed.reduce((sum, purchase) => sum + purchaseTotal(purchase), 0)),
              ],
              ["Cadastro", formatDateTime(supplier.createdAt)],
            ]}
          />
        </div>
        <Card title="Histórico de compras" subtitle={`${purchases.length} documento(s)`}>
          {purchases.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Nenhuma compra"
              text="As compras deste fornecedor aparecerão aqui."
            />
          ) : (
            <DataTable headers={["Compra", "Documento", "Data", "Itens", "Total", "Situação"]}>
              {purchases.map((purchase) => (
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
                  <td>{formatDate(`${purchase.date}T12:00:00`)}</td>
                  <td>{purchase.items.length}</td>
                  <td>{money(purchaseTotal(purchase))}</td>
                  <td>
                    <Status value={PURCHASE_STATUS[purchase.status]} />
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
      </div>
    </>
  );
}
