import { useState } from "react";
import { Button, Dialog, ErrorBanner, Field } from "../../components/ui";
import { useCommand } from "../../components/shared/useCommand";
import { useStore } from "../../store/AppProvider";
import { byId } from "../../store/selectors";

export function StockAdjustDialog({ productId, close }: { productId: string; close: () => void }) {
  const { state } = useStore();
  const { execute, busy, error } = useCommand();
  const product = byId(state.products, productId);
  const [quantity, setQuantity] = useState(product ? String(product.stock) : "0");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  if (!product) return null;
  const newQuantity = Number(quantity);
  const validQuantity = quantity !== "" && Number.isInteger(newQuantity) && newQuantity >= 0;
  const difference = validQuantity ? newQuantity - product.stock : 0;
  const reasonError =
    touched && reason.trim().length < 5
      ? "Motivo obrigatório (mínimo de 5 caracteres)."
      : undefined;
  const quantityError = !validQuantity
    ? "Informe um número inteiro maior ou igual a zero."
    : undefined;

  const submit = () => {
    setTouched(true);
    if (!validQuantity || reason.trim().length < 5 || difference === 0) return;
    execute({ type: "stock.adjust", productId, newQuantity, reason }, { onSuccess: close });
  };

  return (
    <Dialog
      title="Ajuste de estoque"
      subtitle="Gera uma movimentação de ajuste e um evento de auditoria"
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            loading={busy}
            disabledReason={
              difference === 0 && validQuantity
                ? "A nova quantidade é igual ao saldo atual"
                : undefined
            }
          >
            Confirmar ajuste
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <ErrorBanner error={error} />
        <Field label="Produto">
          <input value={`${product.code} — ${product.name}`} readOnly />
        </Field>
        <div className="form-grid">
          <Field label="Quantidade atual">
            <input value={product.stock} readOnly />
          </Field>
          <Field label="Nova quantidade" required error={quantityError}>
            <input
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              autoFocus
            />
          </Field>
        </div>
        <div className={`calculated ${difference < 0 ? "negative" : ""}`}>
          <span>Diferença calculada (nova − atual)</span>
          <strong>
            {difference > 0 ? "+" : ""}
            {difference} unidade(s)
          </strong>
        </div>
        <Field label="Motivo" required error={reasonError}>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Ex.: contagem física de inventário, avaria, extravio..."
          />
        </Field>
      </div>
    </Dialog>
  );
}
