import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button, Card, Field, SearchInput, Select } from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { matchesText } from "../../utils/calculations";
import { endOfDay, startOfDay } from "../../utils/dates";
import { AuditTable } from "./AuditTable";

export function AuditPage() {
  const { state } = useStore();
  const { route } = useNavigation();
  const [query, setQuery] = useState(route.params?.query ?? "");
  const [user, setUser] = useState("all");
  const [operation, setOperation] = useState("all");
  const [entity, setEntity] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const operations = useMemo(
    () => Array.from(new Set(state.audit.map((event) => event.operation))).sort(),
    [state.audit],
  );
  const entities = useMemo(
    () => Array.from(new Set(state.audit.map((event) => event.entityType))).sort(),
    [state.audit],
  );
  const events = useMemo(
    () =>
      state.audit.filter(
        (event) =>
          (user === "all" || event.userId === user) &&
          (operation === "all" || event.operation === operation) &&
          (entity === "all" || event.entityType === entity) &&
          (!from || new Date(event.at) >= startOfDay(`${from}T00:00:00`)) &&
          (!to || new Date(event.at) <= endOfDay(`${to}T00:00:00`)) &&
          matchesText(
            query,
            event.entityLabel,
            event.description,
            event.operation,
            event.before,
            event.after,
            event.entityId,
          ),
      ),
    [state.audit, user, operation, entity, from, to, query],
  );
  const clear = () => {
    setQuery("");
    setUser("all");
    setOperation("all");
    setEntity("all");
    setFrom("");
    setTo("");
  };
  return (
    <>
      <PageHeader title="Auditoria" subtitle="Rastreabilidade das ações realizadas no sistema" />
      <Card className="table-card">
        <div className="filter-row wrap">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Registro, descrição, operação ou valores..."
          />
          <Select
            label="Usuário"
            value={user}
            onChange={setUser}
            options={[
              { value: "all", label: "Todos os usuários" },
              ...state.users.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
          <Select
            label="Operação"
            value={operation}
            onChange={setOperation}
            options={[{ value: "all", label: "Todas as operações" }, ...operations]}
          />
          <Select
            label="Entidade"
            value={entity}
            onChange={setEntity}
            options={[{ value: "all", label: "Todas as entidades" }, ...entities]}
          />
          <Field label="De" className="inline-field">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label="Até" className="inline-field">
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
          <Button variant="secondary" icon={RotateCcw} onClick={clear}>
            Limpar
          </Button>
        </div>
        <div className="result-count">
          <strong>{events.length} evento(s)</strong>
          <span>{state.audit.length} eventos registrados no total</span>
        </div>
        <AuditTable
          key={`${query}-${user}-${operation}-${entity}-${from}-${to}`}
          events={events}
          pageSize={15}
        />
      </Card>
    </>
  );
}
