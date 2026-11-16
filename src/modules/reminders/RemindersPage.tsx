import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card, SearchInput, Select, Tabs } from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { useDeny } from "../../components/shared/permissions";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { isReminderDue, visibleReminders } from "../../store/selectors";
import { matchesText } from "../../utils/calculations";
import { isSameDay } from "../../utils/dates";
import { ReminderList } from "./ReminderList";

const TABS = ["Pendentes", "Hoje e vencidos", "Concluídos", "Cancelados", "Todos"] as const;
type Tab = (typeof TABS)[number];

export function RemindersPage() {
  const { state, user } = useStore();
  const { route, replace, open } = useNavigation();
  const deny = useDeny();
  const focus = route.params?.focus;
  const tab = (TABS.includes(route.tab as Tab) ? route.tab : focus ? "Todos" : "Pendentes") as Tab;
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("all");
  const now = new Date();
  const visible = visibleReminders(state, user.id);
  const filtered = useMemo(
    () =>
      visible
        .filter((reminder) => {
          if (tab === "Pendentes") return reminder.status === "pending";
          if (tab === "Hoje e vencidos")
            return (
              reminder.status === "pending" &&
              (isSameDay(reminder.notifyAt, now) || isReminderDue(reminder, now))
            );
          if (tab === "Concluídos") return reminder.status === "done";
          if (tab === "Cancelados") return reminder.status === "cancelled";
          return true;
        })
        .filter((reminder) => owner === "all" || reminder.ownerId === owner)
        .filter((reminder) => matchesText(query, reminder.title, reminder.description)),
    [visible, tab, owner, query], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return (
    <>
      <PageHeader
        title="Lembretes"
        subtitle="Compromissos e tarefas da equipe com notificações no horário"
        actions={
          <Button
            icon={Plus}
            onClick={() => open({ type: "reminder-form" })}
            disabledReason={deny("reminders.manage")}
          >
            Novo lembrete
          </Button>
        }
      />
      <Card className="table-card">
        <Tabs
          tabs={TABS}
          value={tab}
          onChange={(next) => replace({ page: "reminders", tab: next })}
          counts={{
            Pendentes: visible.filter((item) => item.status === "pending").length,
            "Hoje e vencidos": visible.filter(
              (item) =>
                item.status === "pending" &&
                (isSameDay(item.notifyAt, now) || isReminderDue(item, now)),
            ).length,
          }}
        />
        <div className="filter-row">
          <SearchInput value={query} onChange={setQuery} placeholder="Título ou descrição..." />
          <Select
            label="Responsável"
            value={owner}
            onChange={setOwner}
            options={[
              { value: "all", label: "Todos os responsáveis" },
              ...state.users.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
        </div>
        <div className="card-pad">
          <ReminderList reminders={filtered} focusId={focus} />
        </div>
      </Card>
    </>
  );
}
