import { useState } from "react";
import { Button, Dialog, ErrorBanner, Field } from "../../components/ui";
import { useCommand } from "../../components/shared/useCommand";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId } from "../../store/selectors";
import { onlyDigits } from "../../utils/calculations";

export function SupplierForm({ supplierId, close }: { supplierId?: string; close: () => void }) {
  const { state } = useStore();
  const { navigate } = useNavigation();
  const { execute, busy, error } = useCommand();
  const existing = byId(state.suppliers, supplierId);
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    document: existing?.document ?? "",
    phone: existing?.phone ?? "",
    email: existing?.email ?? "",
    city: existing?.city ?? "",
    contact: existing?.contact ?? "",
    paymentTerms: existing?.paymentTerms ?? "28 dias",
  });
  const [submitted, setSubmitted] = useState(false);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm({ ...form, [key]: event.target.value });
  const errors = {
    name: !form.name.trim() ? "Obrigatório." : undefined,
    document: onlyDigits(form.document).length !== 14 ? "CNPJ com 14 dígitos." : undefined,
    email:
      form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? "E-mail inválido." : undefined,
  };
  const submit = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    execute(
      { type: "supplier.save", id: supplierId, input: form },
      {
        onSuccess: (id) => {
          close();
          if (!existing && id) navigate({ page: "suppliers", id });
        },
      },
    );
  };
  return (
    <Dialog
      title={existing ? `Editar ${existing.name}` : "Novo fornecedor"}
      subtitle="Fornecedores ativos ficam disponíveis no registro de compras"
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={busy}>
            Salvar fornecedor
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <ErrorBanner error={error} />
        <div className="form-grid">
          <Field
            label="Razão social"
            required
            className="span-2"
            error={submitted ? errors.name : undefined}
          >
            <input value={form.name} onChange={set("name")} />
          </Field>
          <Field label="CNPJ" required error={submitted ? errors.document : undefined}>
            <input
              value={form.document}
              onChange={set("document")}
              placeholder="00.000.000/0000-00"
            />
          </Field>
          <Field label="Telefone">
            <input value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="E-mail" error={submitted ? errors.email : undefined}>
            <input type="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Cidade/UF">
            <input value={form.city} onChange={set("city")} />
          </Field>
          <Field label="Contato comercial">
            <input value={form.contact} onChange={set("contact")} />
          </Field>
          <Field label="Condição de pagamento">
            <select value={form.paymentTerms} onChange={set("paymentTerms")}>
              {[
                "À vista",
                "7 dias",
                "14 dias",
                "21/28 dias",
                "28 dias",
                "30 dias",
                "30/60 dias",
              ].map((term) => (
                <option key={term}>{term}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
