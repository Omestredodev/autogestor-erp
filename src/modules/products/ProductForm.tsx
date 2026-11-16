import { useMemo, useState } from "react";
import { BadgeDollarSign } from "lucide-react";
import { Button, Dialog, ErrorBanner, Field, Toggle } from "../../components/ui";
import { useCommand } from "../../components/shared/useCommand";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId } from "../../store/selectors";
import { referencePrice } from "../../utils/calculations";
import { money } from "../../utils/currency";

type Errors = Partial<
  Record<
    | "code"
    | "manufacturerCode"
    | "name"
    | "brandId"
    | "categoryId"
    | "cost"
    | "margin"
    | "min"
    | "max"
    | "initialStock"
    | "ean",
    string
  >
>;

function nextCode(codes: string[]) {
  const max = codes.reduce(
    (value, code) => Math.max(value, Number(code.replace(/\D/g, "")) || 0),
    0,
  );
  return `AG-${String(max + 1).padStart(5, "0")}`;
}

export function ProductForm({ productId, close }: { productId?: string; close: () => void }) {
  const { state } = useStore();
  const { navigate } = useNavigation();
  const { execute, busy, error } = useCommand();
  const existing = byId(state.products, productId);
  const [form, setForm] = useState(() => ({
    code: existing?.code ?? nextCode(state.products.map((product) => product.code)),
    manufacturerCode: existing?.manufacturerCode ?? "",
    ean: existing?.ean ?? "",
    oemCode: existing?.oemCode ?? "",
    name: existing?.name ?? "",
    brandId: existing?.brandId ?? "",
    categoryId: existing?.categoryId ?? "",
    unit: existing?.unit ?? "UN",
    cost: existing ? String(existing.cost) : "",
    margin: existing ? String(Math.round(existing.margin * 10000) / 100) : "",
    initialStock: "0",
    min: existing ? String(existing.min) : "0",
    max: existing ? String(existing.max) : "0",
    location: existing?.location ?? "",
    notes: existing?.notes ?? "",
  }));
  const [applyPrice, setApplyPrice] = useState(!existing);
  const [errors, setErrors] = useState<Errors>({});
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    if (key === "margin" && existing) setApplyPrice(true);
  };

  const cost = Number(form.cost);
  const margin = Number(form.margin) / 100;
  const calculated = useMemo(() => referencePrice(cost, margin), [cost, margin]);

  const validate = (): Errors => {
    const result: Errors = {};
    if (!form.code.trim()) result.code = "Obrigatório.";
    else if (
      state.products.some(
        (product) =>
          product.id !== productId && product.code.toUpperCase() === form.code.trim().toUpperCase(),
      )
    )
      result.code = "Código já utilizado.";
    if (!form.manufacturerCode.trim()) result.manufacturerCode = "Obrigatório.";
    if (!form.name.trim()) result.name = "Obrigatório.";
    if (!form.brandId) result.brandId = "Selecione a marca.";
    if (!form.categoryId) result.categoryId = "Selecione a categoria.";
    if (form.cost === "" || !Number.isFinite(cost) || cost < 0)
      result.cost = "Informe um custo maior ou igual a zero.";
    if (form.margin === "" || !Number.isFinite(margin) || margin < 0 || margin >= 1)
      result.margin = "Entre 0% e 99,99%.";
    if (form.ean && !/^\d{8,14}$/.test(form.ean.trim())) result.ean = "8 a 14 dígitos.";
    const min = Number(form.min);
    const max = Number(form.max);
    if (!Number.isInteger(min) || min < 0) result.min = "Inteiro ≥ 0.";
    if (!Number.isInteger(max) || max < min) result.max = "Deve ser ≥ mínimo.";
    if (
      !existing &&
      (!Number.isInteger(Number(form.initialStock)) || Number(form.initialStock) < 0)
    )
      result.initialStock = "Inteiro ≥ 0.";
    return result;
  };

  const submit = () => {
    const result = validate();
    setErrors(result);
    if (Object.keys(result).length) return;
    execute(
      {
        type: "product.save",
        id: productId,
        input: {
          code: form.code,
          manufacturerCode: form.manufacturerCode,
          ean: form.ean,
          oemCode: form.oemCode,
          name: form.name,
          brandId: form.brandId,
          categoryId: form.categoryId,
          unit: form.unit,
          cost,
          margin,
          initialStock: Number(form.initialStock),
          min: Number(form.min),
          max: Number(form.max),
          location: form.location,
          notes: form.notes,
          applyPrice: existing ? applyPrice : true,
        },
      },
      {
        onSuccess: (id) => {
          close();
          if (!existing && id) navigate({ page: "products", id });
        },
      },
    );
  };

  return (
    <Dialog
      wide
      title={existing ? `Editar produto ${existing.code}` : "Cadastrar produto"}
      subtitle={
        existing
          ? "As alterações são aplicadas a este registro e refletidas em todos os módulos."
          : "Preencha identificação, preço e limites de estoque."
      }
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={busy}>
            {existing ? "Salvar alterações" : "Salvar produto"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <ErrorBanner error={error} />
        {Object.keys(errors).length > 0 && <ErrorBanner error="Revise os campos destacados." />}
        <h4 className="form-section-title">Identificação</h4>
        <div className="form-grid three">
          <Field label="Código interno" required error={errors.code}>
            <input value={form.code} onChange={set("code")} />
          </Field>
          <Field label="Código do fabricante" required error={errors.manufacturerCode}>
            <input value={form.manufacturerCode} onChange={set("manufacturerCode")} />
          </Field>
          <Field label="EAN" error={errors.ean}>
            <input
              value={form.ean}
              onChange={set("ean")}
              inputMode="numeric"
              placeholder="7890000000000"
            />
          </Field>
          <Field label="Descrição" required className="span-2" error={errors.name}>
            <input value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Código OEM">
            <input value={form.oemCode} onChange={set("oemCode")} />
          </Field>
          <Field label="Marca" required error={errors.brandId}>
            <select value={form.brandId} onChange={set("brandId")}>
              <option value="">Selecione</option>
              {state.brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Categoria" required error={errors.categoryId}>
            <select value={form.categoryId} onChange={set("categoryId")}>
              <option value="">Selecione</option>
              {state.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unidade de medida">
            <select value={form.unit} onChange={set("unit")}>
              <option value="UN">UN — Unidade</option>
              <option value="JG">JG — Jogo</option>
              <option value="KIT">KIT — Kit</option>
              <option value="L">L — Litro</option>
            </select>
          </Field>
        </div>
        <h4 className="form-section-title">Preço e margem</h4>
        <div className="form-grid three">
          <Field label="Custo (R$)" required error={errors.cost}>
            <input type="number" min="0" step="0.01" value={form.cost} onChange={set("cost")} />
          </Field>
          <Field label="Margem manual (%)" required error={errors.margin}>
            <input
              type="number"
              min="0"
              max="99.99"
              step="0.01"
              value={form.margin}
              onChange={set("margin")}
            />
          </Field>
          <Field
            label={existing ? "Novo preço calculado" : "Preço de referência calculado"}
            hint={existing ? `Preço salvo atual: ${money(existing.price)}` : undefined}
          >
            <input value={Number.isFinite(calculated) ? money(calculated) : "—"} readOnly />
          </Field>
        </div>
        {existing && (
          <Toggle
            checked={applyPrice}
            onChange={setApplyPrice}
            label="Atualizar o preço de referência com o novo cálculo"
            description={
              applyPrice
                ? `O preço passará de ${money(existing.price)} para ${Number.isFinite(calculated) ? money(calculated) : "—"}.`
                : `O preço salvo de ${money(existing.price)} será mantido.`
            }
          />
        )}
        <div className="formula-note">
          <BadgeDollarSign size={18} />
          <span>
            Preço = Custo ÷ (1 − Margem). Alterações de custo vindas de compras não modificam
            automaticamente o preço padrão.
          </span>
        </div>
        <h4 className="form-section-title">Estoque</h4>
        <div className="form-grid three">
          {existing ? (
            <Field
              label="Estoque atual"
              hint="Alterável apenas por compras, vendas, devoluções ou ajuste."
            >
              <input value={`${existing.stock} ${existing.unit}`} readOnly />
            </Field>
          ) : (
            <Field
              label="Estoque inicial"
              error={errors.initialStock}
              hint="Gera uma movimentação de saldo inicial."
            >
              <input
                type="number"
                min="0"
                step="1"
                value={form.initialStock}
                onChange={set("initialStock")}
              />
            </Field>
          )}
          <Field label="Estoque mínimo" error={errors.min}>
            <input type="number" min="0" step="1" value={form.min} onChange={set("min")} />
          </Field>
          <Field label="Estoque máximo" error={errors.max}>
            <input type="number" min="0" step="1" value={form.max} onChange={set("max")} />
          </Field>
          <Field label="Localização física">
            <input value={form.location} onChange={set("location")} placeholder="Ex.: A-03-02" />
          </Field>
          <Field label="Observações" className="span-2">
            <input value={form.notes} onChange={set("notes")} />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
