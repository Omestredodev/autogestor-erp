import { useState } from "react";
import { Button, Dialog, ErrorBanner, Field } from "../../components/ui";
import { useCommand } from "../../components/shared/useCommand";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId } from "../../store/selectors";
import type { CustomerType } from "../../domain/types";
import { onlyDigits } from "../../utils/calculations";

const TYPES: CustomerType[] = ["Pessoa física", "Oficina", "Frota", "Revenda"];
const TERMS = [
  "À vista",
  "7 dias",
  "15 dias",
  "28 dias",
  "Fechamento quinzenal",
  "Fechamento mensal",
];

export function CustomerForm({ customerId, close }: { customerId?: string; close: () => void }) {
  const { state } = useStore();
  const { navigate } = useNavigation();
  const { execute, busy, error } = useCommand();
  const existing = byId(state.customers, customerId);
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    document: existing?.document ?? "",
    phone: existing?.phone ?? "",
    email: existing?.email ?? "",
    address: existing?.address ?? "",
    type: (existing?.type ?? "Oficina") as CustomerType,
    paymentTerms: existing?.paymentTerms ?? "À vista",
    creditLimit: existing ? String(existing.creditLimit) : "0",
    notes: existing?.notes ?? "",
  });
  const [submitted, setSubmitted] = useState(false);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm({ ...form, [key]: event.target.value });
  const digits = onlyDigits(form.document).length;
  const errors = {
    name: !form.name.trim() ? "Obrigatório." : undefined,
    document: digits !== 11 && digits !== 14 ? "CPF (11) ou CNPJ (14 dígitos)." : undefined,
    email:
      form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? "E-mail inválido." : undefined,
    creditLimit: !(Number(form.creditLimit) >= 0) ? "Valor ≥ 0." : undefined,
  };
  const submit = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    execute(
      {
        type: "customer.save",
        id: customerId,
        input: { ...form, creditLimit: Number(form.creditLimit) },
      },
      {
        onSuccess: (id) => {
          close();
          if (!existing && id) navigate({ page: "clients", id });
        },
      },
    );
  };
  return (
    <Dialog
      title={existing ? `Editar ${existing.name}` : "Novo cliente"}
      subtitle="Disponível imediatamente na frente de caixa, financeiro, fechamentos e lembretes"
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={busy}>
            Salvar cliente
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <ErrorBanner error={error} />
        <div className="form-grid">
          <Field
            label="Nome ou razão social"
            required
            className="span-2"
            error={submitted ? errors.name : undefined}
          >
            <input value={form.name} onChange={set("name")} />
          </Field>
          <Field label="CPF/CNPJ" required error={submitted ? errors.document : undefined}>
            <input value={form.document} onChange={set("document")} />
          </Field>
          <Field label="Tipo de cliente">
            <select value={form.type} onChange={set("type")}>
              {TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </Field>
          <Field label="Telefone">
            <input value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="E-mail" error={submitted ? errors.email : undefined}>
            <input type="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Endereço" className="span-2">
            <input value={form.address} onChange={set("address")} />
          </Field>
          <Field label="Condição de pagamento">
            <select value={form.paymentTerms} onChange={set("paymentTerms")}>
              {TERMS.map((term) => (
                <option key={term}>{term}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Limite de crédito (R$)"
            hint="0 = sem limite definido"
            error={submitted ? errors.creditLimit : undefined}
          >
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.creditLimit}
              onChange={set("creditLimit")}
            />
          </Field>
          <Field label="Observações do cadastro" className="span-2">
            <input value={form.notes} onChange={set("notes")} />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
