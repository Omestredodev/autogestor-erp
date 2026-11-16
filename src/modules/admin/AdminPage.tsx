import { useEffect, useState } from "react";
import { Pencil, Plus, Power, Save } from "lucide-react";
import {
  ActionMenu,
  Button,
  Card,
  Dialog,
  ErrorBanner,
  Field,
  Notice,
  Status,
} from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { useCommand } from "../../components/shared/useCommand";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { byId } from "../../store/selectors";
import { ADMIN_LOCKED_PERMISSIONS, PERMISSIONS } from "../../domain/rules/permissions";
import type { Permission } from "../../domain/types";

function UserDialog({ userId, close }: { userId?: string; close: () => void }) {
  const { state } = useStore();
  const { execute, busy, error } = useCommand();
  const existing = byId(state.users, userId);
  const [name, setName] = useState(existing?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [roleId, setRoleId] = useState(existing?.roleId ?? "role_seller");
  return (
    <Dialog
      title={existing ? `Editar ${existing.name}` : "Novo usuário"}
      subtitle="O perfil define a navegação e as ações permitidas"
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button
            loading={busy}
            onClick={() =>
              execute(
                { type: "user.save", id: userId, input: { name, email, roleId } },
                { onSuccess: close },
              )
            }
          >
            Salvar usuário
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <ErrorBanner error={error} />
        <Field label="Nome" required>
          <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </Field>
        <Field label="E-mail" required>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Perfil">
          <select value={roleId} onChange={(event) => setRoleId(event.target.value)}>
            {state.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Dialog>
  );
}

export function AdminPage() {
  const { state, user: sessionUser } = useStore();
  const { route } = useNavigation();
  const { execute, busy } = useCommand();
  const [editing, setEditing] = useState<string | null | undefined>(
    route.params?.userId ?? undefined,
  );
  const [roleId, setRoleId] = useState(state.roles[0].id);
  const role = state.roles.find((item) => item.id === roleId)!;
  const [draft, setDraft] = useState<Permission[]>(role.permissions);
  useEffect(() => setDraft(role.permissions), [role]);
  const dirty =
    draft.length !== role.permissions.length ||
    draft.some((permission) => !role.permissions.includes(permission));
  const groups = Array.from(new Set(PERMISSIONS.map((permission) => permission.group)));
  const toggle = (permission: Permission) =>
    setDraft((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );

  return (
    <>
      <PageHeader title="Administração" subtitle="Usuários, perfis e permissões" />
      <div className="admin-grid">
        <Card
          title="Usuários"
          subtitle={`${state.users.filter((user) => user.active).length} ativo(s) de ${state.users.length}`}
          action={
            <Button small icon={Plus} onClick={() => setEditing(null)}>
              Novo usuário
            </Button>
          }
        >
          <div className="user-list">
            {state.users.map((user) => (
              <div className="user-row" key={user.id}>
                <span>{user.initials}</span>
                <div>
                  <strong>
                    {user.name}
                    {user.id === sessionUser.id ? " (sessão atual)" : ""}
                  </strong>
                  <small>
                    {state.roles.find((item) => item.id === user.roleId)?.name} · {user.email}
                  </small>
                </div>
                <Status
                  value={
                    user.active ? (user.id === sessionUser.id ? "Online" : "Ativo") : "Inativo"
                  }
                />
                <ActionMenu
                  items={[
                    { label: "Editar", icon: Pencil, onClick: () => setEditing(user.id) },
                    {
                      label: user.active ? "Inativar" : "Reativar",
                      icon: Power,
                      danger: user.active,
                      onClick: () => execute({ type: "user.toggleActive", id: user.id }),
                      disabledReason:
                        user.id === sessionUser.id
                          ? "Não é possível inativar a sessão atual"
                          : undefined,
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        </Card>
        <Card
          title="Perfis e permissões"
          subtitle="Matriz central aplicada à navegação e às ações de negócio"
        >
          <div className="role-tabs">
            {state.roles.map((item) => (
              <button
                type="button"
                className={roleId === item.id ? "active" : ""}
                onClick={() => setRoleId(item.id)}
                key={item.id}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="card-pad">
            <Notice title={role.name}>{role.description}</Notice>
          </div>
          <div className="permission-list">
            {groups.map((group) => (
              <div key={group}>
                <h4 className="permission-group">{group}</h4>
                {PERMISSIONS.filter((permission) => permission.group === group).map(
                  (permission) => {
                    const locked =
                      roleId === "role_admin" && ADMIN_LOCKED_PERMISSIONS.includes(permission.id);
                    return (
                      <label key={permission.id} className={locked ? "disabled" : ""}>
                        <div>
                          <strong>{permission.label}</strong>
                          <small>
                            {locked ? "Obrigatória para o Administrador" : permission.id}
                          </small>
                        </div>
                        <input
                          type="checkbox"
                          checked={draft.includes(permission.id)}
                          disabled={locked}
                          onChange={() => toggle(permission.id)}
                        />
                      </label>
                    );
                  },
                )}
              </div>
            ))}
          </div>
          <div className="card-pad row-buttons end">
            <Button
              variant="secondary"
              disabled={!dirty}
              onClick={() => setDraft(role.permissions)}
            >
              Descartar
            </Button>
            <Button
              icon={Save}
              loading={busy}
              disabled={!dirty}
              onClick={() => execute({ type: "role.update", roleId, permissions: draft })}
            >
              Salvar permissões
            </Button>
          </div>
        </Card>
      </div>
      {editing !== undefined && (
        <UserDialog userId={editing ?? undefined} close={() => setEditing(undefined)} />
      )}
    </>
  );
}
