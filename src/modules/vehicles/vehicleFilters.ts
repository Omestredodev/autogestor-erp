import type { Vehicle } from "../../domain/types";

export interface VehicleFilter {
  maker: string;
  model: string;
  year: string;
  engine: string;
  version: string;
}

export const emptyVehicleFilter: VehicleFilter = {
  maker: "",
  model: "",
  year: "",
  engine: "",
  version: "",
};

const unique = <T>(values: T[]) => Array.from(new Set(values));

/** Dependent options: Fabricante → Modelo → Ano → Motor → Versão. */
export function vehicleOptions(vehicles: Vehicle[], filter: VehicleFilter) {
  const byMaker = vehicles.filter((vehicle) => !filter.maker || vehicle.maker === filter.maker);
  const byModel = byMaker.filter((vehicle) => !filter.model || vehicle.model === filter.model);
  const byYear = byModel.filter(
    (vehicle) =>
      !filter.year ||
      (vehicle.yearFrom <= Number(filter.year) && vehicle.yearTo >= Number(filter.year)),
  );
  const byEngine = byYear.filter((vehicle) => !filter.engine || vehicle.engine === filter.engine);
  const byVersion = byEngine.filter(
    (vehicle) => !filter.version || vehicle.version === filter.version,
  );
  return {
    makers: unique(vehicles.map((vehicle) => vehicle.maker)).sort(),
    models: filter.maker ? unique(byMaker.map((vehicle) => vehicle.model)).sort() : [],
    years: filter.model
      ? unique(
          byModel.flatMap((vehicle) =>
            Array.from(
              { length: vehicle.yearTo - vehicle.yearFrom + 1 },
              (_, index) => vehicle.yearFrom + index,
            ),
          ),
        ).sort((a, b) => b - a)
      : [],
    engines: filter.model ? unique(byYear.map((vehicle) => vehicle.engine)).sort() : [],
    versions: filter.model ? unique(byEngine.map((vehicle) => vehicle.version)).sort() : [],
    matches: byVersion,
  };
}

/** Clears dependent selections when a parent changes. */
export function updateFilter(
  filter: VehicleFilter,
  key: keyof VehicleFilter,
  value: string,
): VehicleFilter {
  const order: (keyof VehicleFilter)[] = ["maker", "model", "year", "engine", "version"];
  const next = { ...filter, [key]: value };
  for (const dependent of order.slice(order.indexOf(key) + 1)) next[dependent] = "";
  return next;
}
