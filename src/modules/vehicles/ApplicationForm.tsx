import { useState } from "react";
import { Button, Dialog, ErrorBanner, Field, Notice } from "../../components/ui";
import { useCommand } from "../../components/shared/useCommand";
import { useStore } from "../../store/AppProvider";
import { byId, vehicleLabel } from "../../store/selectors";
import {
  emptyVehicleFilter,
  updateFilter,
  vehicleOptions,
  type VehicleFilter,
} from "./vehicleFilters";

export function ApplicationForm({
  productId,
  vehicleId,
  close,
}: {
  productId?: string;
  vehicleId?: string;
  close: () => void;
}) {
  const { state } = useStore();
  const { execute, busy, error } = useCommand();
  const initialVehicle = byId(state.vehicles, vehicleId);
  const [product, setProduct] = useState(productId ?? "");
  const [filter, setFilter] = useState<VehicleFilter>(
    initialVehicle
      ? {
          maker: initialVehicle.maker,
          model: initialVehicle.model,
          year: "",
          engine: initialVehicle.engine,
          version: initialVehicle.version,
        }
      : emptyVehicleFilter,
  );
  const [notes, setNotes] = useState("");
  const options = vehicleOptions(state.vehicles, filter);
  const vehicle = filter.version && options.matches.length === 1 ? options.matches[0] : undefined;
  const set = (key: keyof VehicleFilter) => (event: { target: { value: string } }) =>
    setFilter(updateFilter(filter, key, event.target.value));

  return (
    <Dialog
      title="Associar produto a veículo"
      subtitle="A aplicação aparecerá na busca por veículo e na aba Aplicações do produto"
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button
            loading={busy}
            disabledReason={
              !product
                ? "Selecione o produto"
                : !vehicle
                  ? "Selecione fabricante, modelo, motor e versão"
                  : undefined
            }
            onClick={() =>
              vehicle &&
              execute(
                { type: "application.create", productId: product, vehicleId: vehicle.id, notes },
                { onSuccess: close },
              )
            }
          >
            Salvar aplicação
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Notice title="Cadastro demonstrativo">
          Registre apenas compatibilidades verificadas. Os exemplos desta base não são tecnicamente
          validados.
        </Notice>
        <ErrorBanner error={error} />
        <Field label="Produto" required>
          <select value={product} onChange={(event) => setProduct(event.target.value)}>
            <option value="">Selecione</option>
            {state.products
              .filter((item) => item.active)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.name}
                </option>
              ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field label="Fabricante" required>
            <select value={filter.maker} onChange={set("maker")}>
              <option value="">Selecione</option>
              {options.makers.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Modelo" required>
            <select value={filter.model} onChange={set("model")} disabled={!filter.maker}>
              <option value="">Selecione</option>
              {options.models.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Motor" required>
            <select value={filter.engine} onChange={set("engine")} disabled={!filter.model}>
              <option value="">Selecione</option>
              {options.engines.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Versão" required>
            <select value={filter.version} onChange={set("version")} disabled={!filter.engine}>
              <option value="">Selecione</option>
              {options.versions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>
        {vehicle && (
          <div className="calculated">
            <span>Veículo selecionado</span>
            <strong>{vehicleLabel(vehicle)}</strong>
          </div>
        )}
        <Field label="Observações">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex.: somente para veículos com ar-condicionado"
          />
        </Field>
      </div>
    </Dialog>
  );
}
