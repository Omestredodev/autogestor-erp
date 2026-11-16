import { useState } from "react";
import { Button, Dialog, ErrorBanner, Field } from "../../components/ui";
import { useCommand } from "../../components/shared/useCommand";
import { useStore } from "../../store/AppProvider";
import { byId } from "../../store/selectors";
import { addMinutes, fromInputDateTime, toInputDate, toInputTime } from "../../utils/dates";

export function ReminderForm({
  reminderId,
  customerId,
  productId,
  saleId,
  close,
}: {
  reminderId?: string;
  customerId?: string;
  productId?: string;
  saleId?: string;
  close: () => void;
}) {
  const { state, user } = useStore();
  const { execute, busy, error } = useCommand();
  const existing = byId(state.reminders, reminderId);
  const defaultDue = existing ? new Date(existing.dueAt) : addMinutes(new Date(), 60);
  const sale = byId(state.sales, existing?.saleId ?? saleId);
  const [form, setForm] = useState({
    title: existing?.title ?? (sale ? `Acompanhar venda ${sale.number}` : ""),
    description: existing?.description ?? "",
    date: toInputDate(defaultDue),
    time: toInputTime(defaultDue),
    ownerId: existing?.ownerId ?? user.id,
    sharing: existing?.sharing ?? ("team" as "private" | "team"),
    customerId:
      existing?.customerId ??
      customerId ??
      (sale && !byId(state.customers, sale.customerId)?.generic ? sale.customerId : ""),
    productId: existing?.productId ?? productId ?? "",
    saleId: existing?.saleId ?? saleId ?? "",
  });
  const [submitted, setSubmitted] = useState(false);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm({ ...form, [key]: event.target.value });
  const dueAt = fromInputDateTime(form.date, form.time);
  const errors = {
    title: !form.title.trim() ? "Informe o título." : undefined,
    date: !dueAt ? "Data/horário inválidos." : undefined,
  };
  const submit = () => {
    setSubmitted(true);
    if (errors.title || errors.date) return;
    execute(
      {
        type: "reminder.save",
        id: reminderId,
        input: {
          title: form.title,
          description: form.description,
          dueAt,
          ownerId: form.ownerId,
          sharing: form.sharing,
          customerId: form.customerId || undefined,
          productId: form.productId || undefined,
          saleId: form.saleId || undefined,
        },
      },
      { onSuccess: close },
    );
  };
  return (
    <Dialog
      title={existing ? "Editar lembrete" : "Novo lembrete"}
      subtitle="A notificação aparece no canto inferior direito no horário definido"
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={busy}>
            {existing ? "Salvar lembrete" : "Criar lembrete"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <ErrorBanner error={error} />
        <Field label="Título" required error={submitted ? errors.title : undefined}>
          <input value={form.title} onChange={set("title")} autoFocus />
        </Field>
        <Field label="Descrição">
          <textarea
            value={form.description}
            onChange={set("description")}
            placeholder="Detalhes do lembrete..."
          />
        </Field>
        <div className="form-grid">
          <Field label="Data" required error={submitted ? errors.date : undefined}>
            <input type="date" value={form.date} onChange={set("date")} />
          </Field>
          <Field label="Horário" required>
            <input type="time" value={form.time} onChange={set("time")} />
          </Field>
          <Field label="Responsável">
            <select value={form.ownerId} onChange={set("ownerId")}>
              {state.users
                .filter((item) => item.active)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Compartilhamento">
            <select value={form.sharing} onChange={set("sharing")}>
              <option value="team">Toda a equipe</option>
              <option value="private">Somente o responsável</option>
            </select>
          </Field>
          <Field label="Cliente relacionado">
            <select value={form.customerId} onChange={set("customerId")}>
              <option value="">Nenhum</option>
              {state.customers
                .filter((item) => !item.generic)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Produto relacionado">
            <select value={form.productId} onChange={set("productId")}>
              <option value="">Nenhum</option>
              {state.products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Venda relacionada" className="span-2">
            <select value={form.saleId} onChange={set("saleId")}>
              <option value="">Nenhuma</option>
              {[...state.sales].reverse().map((item) => (
                <option key={item.id} value={item.id}>
                  {item.number} · {item.customerName}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
