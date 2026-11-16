import { useState } from "react";
import { Button, DataTable, Dialog, ErrorBanner, Field, Notice } from "../../components/ui";
import { useCommand } from "../../components/shared/useCommand";
import { useStore } from "../../store/AppProvider";
import { byId } from "../../store/selectors";
import {
  availableToReturn,
  closingBalance,
  netPaid,
  returnedQuantity,
  saleBalance,
  saleGross,
  salePayments,
  saleReturnedValue,
  saleValueAfterReturns,
} from "../../domain/rules/finance";
import type { PaymentMethod } from "../../domain/types";
import type { PaymentTarget } from "../../store/actions";
import { money, round2 } from "../../utils/currency";

export function ReturnDialog({ saleId, close }: { saleId: string; close: () => void }) {
  const { state } = useStore();
  const { execute, busy, error } = useCommand();
  const sale = byId(state.sales, saleId);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  if (!sale) return null;
  const rows = sale.items.map((item) => {
    const already = returnedQuantity(state, item.id);
    const available = availableToReturn(state, item);
    const raw = quantities[item.id] ?? "0";
    const quantity = Number(raw);
    const invalid = !Number.isInteger(quantity) || quantity < 0 || quantity > available;
    return { item, already, available, quantity: invalid ? 0 : quantity, raw, invalid };
  });
  const value = round2(rows.reduce((sum, row) => sum + row.quantity * row.item.price, 0));
  const original = saleGross(sale);
  const previous = saleReturnedValue(state, sale);
  const hasInvalid = rows.some((row) => row.invalid);
  const nothing = rows.every((row) => row.quantity === 0);
  const closing = byId(state.closings, sale.closingId);
  const balanceBefore = closing ? closingBalance(state, closing) : saleBalance(state, sale);
  const balanceAfter = round2(balanceBefore - value);

  const submit = () => {
    setSubmitted(true);
    if (hasInvalid || nothing || !reason.trim()) return;
    execute(
      {
        type: "sale.return",
        saleId,
        reason,
        items: rows
          .filter((row) => row.quantity > 0)
          .map((row) => ({ saleItemId: row.item.id, quantity: row.quantity })),
      },
      { onSuccess: close },
    );
  };

  return (
    <Dialog
      wide
      title={`Registrar devolução · ${sale.number}`}
      subtitle="Devolução parcial ou total. A venda original é preservada."
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
              nothing
                ? "Informe ao menos uma quantidade"
                : hasInvalid
                  ? "Quantidade acima do disponível"
                  : undefined
            }
          >
            Confirmar devolução
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <ErrorBanner error={error} />
        <DataTable
          headers={[
            "Produto",
            "Qtd. original",
            "Já devolvida",
            "Disponível",
            "Nova devolução",
            "Qtd. líquida",
            "Preço praticado",
            "Valor devolvido",
          ]}
        >
          {rows.map((row) => (
            <tr key={row.item.id}>
              <td>
                <strong>{row.item.name}</strong>
                <small>{row.item.code}</small>
              </td>
              <td>{row.item.quantity}</td>
              <td>{row.already}</td>
              <td>{row.available}</td>
              <td>
                <input
                  className={`table-input ${row.invalid ? "invalid" : ""}`}
                  type="number"
                  min="0"
                  max={row.available}
                  step="1"
                  value={row.raw}
                  disabled={row.available === 0}
                  onChange={(event) =>
                    setQuantities({ ...quantities, [row.item.id]: event.target.value })
                  }
                  aria-label={`Quantidade a devolver de ${row.item.code}`}
                />
                {row.invalid && <small className="field-error">Máx. {row.available}</small>}
              </td>
              <td>{row.item.quantity - row.already - row.quantity}</td>
              <td>{money(row.item.price)}</td>
              <td>{money(row.quantity * row.item.price)}</td>
            </tr>
          ))}
        </DataTable>
        <div className="return-summary">
          <div>
            <span>Valor original</span>
            <strong>{money(original)}</strong>
          </div>
          <div>
            <span>Já devolvido</span>
            <strong>− {money(previous)}</strong>
          </div>
          <div>
            <span>Esta devolução</span>
            <strong>− {money(value)}</strong>
          </div>
          <div>
            <span>Valor líquido</span>
            <strong>{money(round2(original - previous - value))}</strong>
          </div>
        </div>
        <Notice title="Efeito financeiro" tone={balanceAfter < -0.004 ? "warning" : "info"}>
          {balanceAfter < -0.004
            ? `Será gerada pendência de reembolso/crédito de ${money(-balanceAfter)}${closing ? ` no fechamento ${closing.number}` : ""}. O pagamento histórico é preservado.`
            : `Saldo a receber passará de ${money(Math.max(0, balanceBefore))} para ${money(Math.max(0, balanceAfter))}${closing ? ` (fechamento ${closing.number})` : ""}.`}
        </Notice>
        <Field
          label="Motivo da devolução"
          required
          error={submitted && !reason.trim() ? "Informe o motivo." : undefined}
        >
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: peça incompatível, defeito de fabricação..."
          />
        </Field>
      </div>
    </Dialog>
  );
}

export function CancelDialog({ saleId, close }: { saleId: string; close: () => void }) {
  const { state } = useStore();
  const { execute, busy, error } = useCommand();
  const sale = byId(state.sales, saleId);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  if (!sale) return null;
  const reversals = sale.items
    .map((item) => ({ item, remaining: item.quantity - returnedQuantity(state, item.id) }))
    .filter((row) => row.remaining > 0);
  const value = saleValueAfterReturns(state, sale);
  const paid = netPaid(salePayments(state, sale.id));
  const closing = byId(state.closings, sale.closingId);
  return (
    <Dialog
      title={`Cancelar venda ${sale.number}`}
      subtitle="A venda não será removida do histórico"
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Voltar
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={() => {
              setSubmitted(true);
              if (reason.trim())
                execute({ type: "sale.cancel", saleId, reason }, { onSuccess: close });
            }}
          >
            Confirmar cancelamento
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <ErrorBanner error={error} />
        <Notice title="Efeitos do cancelamento" tone="danger">
          Status passará para CANCELADA; {money(value)} serão excluídos do faturamento válido.
          {paid > 0.004 && !closing
            ? ` Há ${money(paid)} recebidos: será gerado reembolso pendente (não executado automaticamente).`
            : ""}
          {closing ? ` O total do fechamento ${closing.number} será recalculado.` : ""}
        </Notice>
        <div className="summary-lines boxed">
          <div>
            <span>Reversão de estoque (descontadas devoluções)</span>
            <strong>{reversals.length ? "" : "Nada a reverter"}</strong>
          </div>
          {reversals.map((row) => (
            <div key={row.item.id}>
              <span>
                {row.item.code} — {row.item.name}
              </span>
              <strong className="qty-positive">+{row.remaining} un.</strong>
            </div>
          ))}
        </div>
        <Field
          label="Motivo obrigatório"
          required
          error={submitted && !reason.trim() ? "Informe o motivo do cancelamento." : undefined}
        >
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Descreva o motivo do cancelamento..."
          />
        </Field>
      </div>
    </Dialog>
  );
}

const METHODS: PaymentMethod[] = [
  "PIX",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Boleto",
  "Crédito do cliente",
];

export function PaymentDialog({
  target,
  mode,
  close,
}: {
  target: PaymentTarget;
  mode: "receipt" | "refund";
  close: () => void;
}) {
  const { state } = useStore();
  const { execute, busy, error } = useCommand();
  const sale = "saleId" in target ? byId(state.sales, target.saleId) : undefined;
  const closing = "closingId" in target ? byId(state.closings, target.closingId) : undefined;
  const balance = sale ? saleBalance(state, sale) : closing ? closingBalance(state, closing) : 0;
  const limit = round2(mode === "receipt" ? Math.max(0, balance) : Math.max(0, -balance));
  const [amount, setAmount] = useState(limit ? String(limit) : "");
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [notes, setNotes] = useState("");
  const value = Number(amount);
  const amountError =
    !Number.isFinite(value) || value <= 0
      ? "Informe um valor maior que zero."
      : value > limit + 0.004
        ? `Máximo ${money(limit)}.`
        : undefined;
  const label = sale ? `venda ${sale.number}` : `fechamento ${closing?.number}`;
  return (
    <Dialog
      title={mode === "receipt" ? "Registrar pagamento" : "Registrar reembolso"}
      subtitle={`Referente à ${label}`}
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button
            variant={mode === "receipt" ? "success" : "primary"}
            loading={busy}
            disabledReason={amountError}
            onClick={() =>
              execute(
                {
                  type: mode === "receipt" ? "payment.register" : "payment.refund",
                  target,
                  amount: value,
                  method,
                  notes,
                },
                { onSuccess: close },
              )
            }
          >
            {mode === "receipt" ? "Confirmar pagamento" : "Confirmar reembolso"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <ErrorBanner error={error} />
        <div className="calculated">
          <span>{mode === "receipt" ? "Saldo pendente" : "Reembolso pendente"}</span>
          <strong>{money(limit)}</strong>
        </div>
        <div className="form-grid">
          <Field
            label="Valor (R$)"
            required
            error={amount ? amountError : undefined}
            hint={mode === "receipt" ? "Pagamentos parciais são permitidos." : undefined}
          >
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Forma" required>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            >
              {METHODS.filter((item) => mode === "refund" || item !== "Crédito do cliente").map(
                (item) => (
                  <option key={item}>{item}</option>
                ),
              )}
            </select>
          </Field>
        </div>
        <Field label="Observações">
          <input value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}
