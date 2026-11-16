import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Dialog, ErrorBanner, Field, Toggle } from "../../components/ui";
import { useCommand } from "../../components/shared/useCommand";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId } from "../../store/selectors";
import { money, round2 } from "../../utils/currency";
import { toInputDate } from "../../utils/dates";

interface Line {
  key: number;
  productId: string;
  quantity: string;
  unitCost: string;
}

let lineKey = 0;

export function PurchaseForm({
  purchaseId,
  supplierId,
  productId,
  close,
}: {
  purchaseId?: string;
  supplierId?: string;
  productId?: string;
  close: () => void;
}) {
  const { state } = useStore();
  const { navigate } = useNavigation();
  const { execute, busy, error, setError } = useCommand();
  const existing = byId(state.purchases, purchaseId);
  const initialProduct = byId(state.products, productId);
  const [supplier, setSupplier] = useState(existing?.supplierId ?? supplierId ?? "");
  const [documentNumber, setDocumentNumber] = useState(existing?.documentNumber ?? "");
  const [date, setDate] = useState(existing?.date ?? toInputDate());
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [updateCost, setUpdateCost] = useState(existing?.updateCost ?? true);
  const [lines, setLines] = useState<Line[]>(() =>
    existing
      ? existing.items.map((item) => ({
          key: ++lineKey,
          productId: item.productId,
          quantity: String(item.quantity),
          unitCost: String(item.unitCost),
        }))
      : [
          {
            key: ++lineKey,
            productId: initialProduct?.id ?? "",
            quantity: "1",
            unitCost: initialProduct ? String(initialProduct.cost) : "",
          },
        ],
  );
  const [submitted, setSubmitted] = useState(false);

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, ...patch };
        if (patch.productId && !line.unitCost)
          next.unitCost = String(byId(state.products, patch.productId)?.cost ?? "");
        return next;
      }),
    );
  const subtotal = (line: Line) =>
    round2((Number(line.quantity) || 0) * (Number(line.unitCost) || 0));
  const total = round2(lines.reduce((sum, line) => sum + subtotal(line), 0));
  const lineError = (line: Line) => {
    if (!line.productId) return "Selecione o produto";
    if (!Number.isInteger(Number(line.quantity)) || Number(line.quantity) <= 0)
      return "Quantidade inteira > 0";
    if (line.unitCost === "" || Number(line.unitCost) < 0) return "Custo ≥ 0";
    if (lines.filter((other) => other.productId === line.productId).length > 1)
      return "Produto repetido";
    return undefined;
  };
  const headerErrors = {
    supplier: !supplier ? "Selecione o fornecedor." : undefined,
    documentNumber: !documentNumber.trim() ? "Informe o documento." : undefined,
    date: !date ? "Informe a data." : undefined,
  };
  const hasErrors =
    Object.values(headerErrors).some(Boolean) ||
    lines.length === 0 ||
    lines.some((line) => lineError(line));

  const submit = (confirm: boolean) => {
    setSubmitted(true);
    setError(null);
    if (hasErrors) return;
    execute(
      {
        type: "purchase.save",
        id: existing?.id,
        confirm,
        input: {
          supplierId: supplier,
          documentNumber,
          date,
          notes,
          updateCost,
          items: lines.map((line) => ({
            productId: line.productId,
            quantity: Number(line.quantity),
            unitCost: Number(line.unitCost),
          })),
        },
      },
      {
        onSuccess: (id) => {
          close();
          if (id) navigate({ page: "purchases", id });
        },
      },
    );
  };

  return (
    <Dialog
      wide
      title={existing ? `Editar rascunho ${existing.number}` : "Registrar compra"}
      subtitle="Rascunhos não alteram o estoque. A confirmação gera as movimentações de entrada."
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={() => submit(false)} loading={busy}>
            Salvar rascunho
          </Button>
          <Button variant="success" onClick={() => submit(true)} loading={busy}>
            Confirmar entrada
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <ErrorBanner error={error} />
        {submitted && hasErrors && <ErrorBanner error="Revise os campos e itens destacados." />}
        <div className="form-grid three">
          <Field label="Fornecedor" required error={submitted ? headerErrors.supplier : undefined}>
            <select value={supplier} onChange={(event) => setSupplier(event.target.value)}>
              <option value="">Selecione</option>
              {state.suppliers
                .filter((item) => item.active || item.id === supplier)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field
            label="Número do documento"
            required
            error={submitted ? headerErrors.documentNumber : undefined}
          >
            <input
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
              placeholder="NF 000.000"
            />
          </Field>
          <Field label="Data da compra" required error={submitted ? headerErrors.date : undefined}>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
        </div>
        <h4 className="form-section-title">Produtos da compra</h4>
        <div className="purchase-lines">
          <div className="purchase-head">
            <span>Produto</span>
            <span>Quantidade</span>
            <span>Custo unitário (R$)</span>
            <span>Subtotal</span>
            <span />
          </div>
          {lines.map((line) => {
            const problem = submitted ? lineError(line) : undefined;
            const product = byId(state.products, line.productId);
            return (
              <div key={line.key} className={problem ? "invalid-line" : ""}>
                <div>
                  <select
                    value={line.productId}
                    onChange={(event) => updateLine(line.key, { productId: event.target.value })}
                    aria-label="Produto"
                  >
                    <option value="">Selecione o produto</option>
                    {state.products
                      .filter((item) => item.active)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} — {item.name}
                        </option>
                      ))}
                  </select>
                  {product && (
                    <small className="field-hint">
                      Estoque atual {product.stock} · custo atual {money(product.cost)}
                    </small>
                  )}
                  {problem && <small className="field-error">{problem}</small>}
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={line.quantity}
                  onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                  aria-label="Quantidade"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitCost}
                  onChange={(event) => updateLine(line.key, { unitCost: event.target.value })}
                  aria-label="Custo unitário"
                />
                <strong>{money(subtotal(line))}</strong>
                <button
                  type="button"
                  onClick={() => setLines(lines.filter((item) => item.key !== line.key))}
                  aria-label="Remover item"
                  disabled={lines.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="add-line"
            onClick={() =>
              setLines([...lines, { key: ++lineKey, productId: "", quantity: "1", unitCost: "" }])
            }
          >
            <Plus size={16} /> Adicionar produto
          </button>
        </div>
        <Toggle
          checked={updateCost}
          onChange={setUpdateCost}
          label="Atualizar o custo atual dos produtos com os custos desta compra"
          description="O preço de referência salvo não é alterado automaticamente."
        />
        <Field label="Observações">
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <div className="purchase-total">
          <span>
            Total da compra · {lines.length} item(ns) ·{" "}
            {lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)} unidade(s)
          </span>
          <strong>{money(total)}</strong>
        </div>
      </div>
    </Dialog>
  );
}
