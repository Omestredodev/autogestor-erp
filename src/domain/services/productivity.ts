import type { CompanySettings, Permission, Reminder } from "../types";
import type { ReminderInput, UserInput } from "./commands";
import { ensure, finish, newId, record, requirePermission, requireText, type Ctx } from "./core";
import { ADMIN_LOCKED_PERMISSIONS, ALL_PERMISSIONS } from "../rules/permissions";
import { addMinutes, formatDateTime } from "../../utils/dates";

function relatedIds(input: Pick<ReminderInput, "customerId" | "productId" | "saleId">) {
  return [input.customerId, input.productId, input.saleId].filter(Boolean) as string[];
}

export function saveReminder(ctx: Ctx, id: string | undefined, input: ReminderInput) {
  requirePermission(ctx, "reminders.manage");
  const title = requireText(input.title, "Informe o título do lembrete.");
  ensure(
    input.dueAt && !Number.isNaN(new Date(input.dueAt).getTime()),
    "Informe data e horário válidos.",
  );
  ensure(
    ctx.state.users.some((user) => user.id === input.ownerId && user.active),
    "Selecione um responsável ativo.",
  );
  if (input.customerId)
    ensure(
      ctx.state.customers.some((item) => item.id === input.customerId),
      "Cliente relacionado inválido.",
    );
  if (input.productId)
    ensure(
      ctx.state.products.some((item) => item.id === input.productId),
      "Produto relacionado inválido.",
    );
  if (input.saleId)
    ensure(
      ctx.state.sales.some((item) => item.id === input.saleId),
      "Venda relacionada inválida.",
    );
  const data = {
    title,
    description: input.description.trim(),
    dueAt: input.dueAt,
    ownerId: input.ownerId,
    sharing: input.sharing,
    customerId: input.customerId || undefined,
    productId: input.productId || undefined,
    saleId: input.saleId || undefined,
  };
  if (!id) {
    const reminder: Reminder = {
      ...data,
      id: newId(ctx, "rem"),
      notifyAt: input.dueAt,
      status: "pending",
      createdAt: ctx.now,
      history: [
        { at: ctx.now, userId: ctx.user.id, action: `Criado para ${formatDateTime(input.dueAt)}` },
      ],
    };
    record(ctx, {
      operation: "Lembrete criado",
      entityType: "Lembrete",
      entityId: reminder.id,
      entityLabel: title,
      description: `${title} · ${formatDateTime(input.dueAt)}`,
      after: "Pendente",
      relatedIds: [reminder.id, ...relatedIds(input)],
    });
    return {
      state: finish(ctx, { reminders: [...ctx.state.reminders, reminder] }),
      message: `Lembrete criado para ${formatDateTime(input.dueAt)}.`,
      entityId: reminder.id,
    };
  }
  const current = ctx.state.reminders.find((item) => item.id === id);
  ensure(current, "Lembrete não encontrado.");
  const rescheduled = current.dueAt !== input.dueAt;
  record(ctx, {
    operation: "Lembrete editado",
    entityType: "Lembrete",
    entityId: id,
    entityLabel: title,
    description: title,
    before: formatDateTime(current.dueAt),
    after: formatDateTime(input.dueAt),
    relatedIds: [id, ...relatedIds(input)],
  });
  const updated: Reminder = {
    ...current,
    ...data,
    notifyAt: rescheduled ? input.dueAt : current.notifyAt,
    history: [
      ...current.history,
      {
        at: ctx.now,
        userId: ctx.user.id,
        action: rescheduled
          ? `Reagendado para ${formatDateTime(input.dueAt)}`
          : "Dados atualizados",
      },
    ],
  };
  return {
    state: finish(ctx, {
      reminders: ctx.state.reminders.map((item) => (item.id === id ? updated : item)),
    }),
    message: "Lembrete atualizado.",
    entityId: id,
  };
}

export function setReminderStatus(ctx: Ctx, id: string, status: "done" | "cancelled") {
  requirePermission(ctx, "reminders.manage");
  const reminder = ctx.state.reminders.find((item) => item.id === id);
  ensure(reminder, "Lembrete não encontrado.");
  ensure(reminder.status === "pending", "Este lembrete já foi encerrado.");
  const label = status === "done" ? "Concluído" : "Cancelado";
  record(ctx, {
    operation: status === "done" ? "Lembrete concluído" : "Lembrete cancelado",
    entityType: "Lembrete",
    entityId: id,
    entityLabel: reminder.title,
    description: reminder.title,
    before: "Pendente",
    after: label,
    relatedIds: [id, ...relatedIds(reminder)],
  });
  return {
    state: finish(ctx, {
      reminders: ctx.state.reminders.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              history: [...item.history, { at: ctx.now, userId: ctx.user.id, action: label }],
            }
          : item,
      ),
    }),
    message: `Lembrete ${label.toLowerCase()}.`,
    entityId: id,
  };
}

export function postponeReminder(ctx: Ctx, id: string, minutes: number) {
  requirePermission(ctx, "reminders.manage");
  const reminder = ctx.state.reminders.find((item) => item.id === id);
  ensure(reminder?.status === "pending", "Somente lembretes pendentes podem ser adiados.");
  ensure(minutes === 30 || minutes === 60, "Adiamento inválido.");
  const notifyAt = addMinutes(ctx.now, minutes).toISOString();
  const label = minutes === 30 ? "30 minutos" : "1 hora";
  record(ctx, {
    operation: "Lembrete adiado",
    entityType: "Lembrete",
    entityId: id,
    entityLabel: reminder.title,
    description: `${reminder.title} · adiado ${label}`,
    before: formatDateTime(reminder.notifyAt),
    after: formatDateTime(notifyAt),
    relatedIds: [id, ...relatedIds(reminder)],
  });
  return {
    state: finish(ctx, {
      reminders: ctx.state.reminders.map((item) =>
        item.id === id
          ? {
              ...item,
              notifyAt,
              history: [
                ...item.history,
                {
                  at: ctx.now,
                  userId: ctx.user.id,
                  action: `Adiado ${label} → ${formatDateTime(notifyAt)}`,
                },
              ],
            }
          : item,
      ),
    }),
    message: `Lembrete adiado para ${formatDateTime(notifyAt)}.`,
    entityId: id,
  };
}

export function saveUser(ctx: Ctx, id: string | undefined, input: UserInput) {
  requirePermission(ctx, "users.manage");
  const name = requireText(input.name, "Informe o nome do usuário.");
  const email = requireText(input.email, "Informe o e-mail do usuário.").toLowerCase();
  ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "Informe um e-mail válido.");
  ensure(
    !ctx.state.users.some((user) => user.id !== id && user.email.toLowerCase() === email),
    "Este e-mail já está em uso.",
  );
  const role = ctx.state.roles.find((item) => item.id === input.roleId);
  ensure(role, "Selecione um perfil.");
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  if (!id) {
    const userId = newId(ctx, "usr");
    record(ctx, {
      operation: "Usuário cadastrado",
      entityType: "Usuário",
      entityId: userId,
      entityLabel: name,
      description: email,
      after: role.name,
    });
    return {
      state: finish(ctx, {
        users: [
          ...ctx.state.users,
          { id: userId, name, email, initials, roleId: role.id, active: true, createdAt: ctx.now },
        ],
      }),
      message: `Usuário ${name} cadastrado.`,
      entityId: userId,
    };
  }
  const current = ctx.state.users.find((user) => user.id === id);
  ensure(current, "Usuário não encontrado.");
  if (current.id === ctx.user.id)
    ensure(current.roleId === role.id, "Não é possível alterar o próprio perfil nesta sessão.");
  const previousRole = ctx.state.roles.find((item) => item.id === current.roleId)?.name;
  record(ctx, {
    operation: "Usuário editado",
    entityType: "Usuário",
    entityId: id,
    entityLabel: name,
    description: email,
    before: `${current.name} · ${previousRole}`,
    after: `${name} · ${role.name}`,
  });
  return {
    state: finish(ctx, {
      users: ctx.state.users.map((user) =>
        user.id === id ? { ...user, name, email, initials, roleId: role.id } : user,
      ),
    }),
    message: `Usuário ${name} atualizado.`,
    entityId: id,
  };
}

export function toggleUser(ctx: Ctx, id: string) {
  requirePermission(ctx, "users.manage");
  const user = ctx.state.users.find((item) => item.id === id);
  ensure(user, "Usuário não encontrado.");
  ensure(user.id !== ctx.user.id, "Não é possível inativar o usuário da sessão atual.");
  record(ctx, {
    operation: user.active ? "Usuário inativado" : "Usuário reativado",
    entityType: "Usuário",
    entityId: id,
    entityLabel: user.name,
    description: user.email,
    before: user.active ? "Ativo" : "Inativo",
    after: user.active ? "Inativo" : "Ativo",
  });
  return {
    state: finish(ctx, {
      users: ctx.state.users.map((item) =>
        item.id === id ? { ...item, active: !item.active } : item,
      ),
    }),
    message: user.active ? `Usuário ${user.name} inativado.` : `Usuário ${user.name} reativado.`,
    entityId: id,
  };
}

export function updateRole(ctx: Ctx, roleId: string, permissions: Permission[]) {
  requirePermission(ctx, "users.manage");
  const role = ctx.state.roles.find((item) => item.id === roleId);
  ensure(role, "Perfil não encontrado.");
  const valid = Array.from(
    new Set(permissions.filter((permission) => ALL_PERMISSIONS.includes(permission))),
  );
  if (roleId === "role_admin") {
    for (const locked of ADMIN_LOCKED_PERMISSIONS)
      ensure(
        valid.includes(locked),
        "O perfil Administrador deve manter o gerenciamento de usuários e a auditoria.",
      );
  }
  record(ctx, {
    operation: "Permissões alteradas",
    entityType: "Perfil",
    entityId: roleId,
    entityLabel: role.name,
    description: `${valid.length} permissões`,
    before: `${role.permissions.length} permissões`,
    after: `${valid.length} permissões`,
  });
  return {
    state: finish(ctx, {
      roles: ctx.state.roles.map((item) =>
        item.id === roleId ? { ...item, permissions: valid } : item,
      ),
    }),
    message: `Permissões do perfil ${role.name} salvas.`,
    entityId: roleId,
  };
}

export function switchRole(ctx: Ctx, roleId: string) {
  const role = ctx.state.roles.find((item) => item.id === roleId);
  ensure(role, "Perfil não encontrado.");
  const user = ctx.state.users.find((item) => item.roleId === roleId && item.active);
  ensure(user, `Não há usuário ativo com o perfil ${role.name}.`);
  record(ctx, {
    operation: "Perfil de demonstração alterado",
    entityType: "Sessão",
    entityId: user.id,
    entityLabel: user.name,
    description: `Sessão alterada para ${user.name}`,
    before: ctx.role.name,
    after: role.name,
  });
  return {
    state: finish(ctx, { session: { userId: user.id } }),
    message: `Sessão de demonstração: ${user.name} (${role.name}).`,
    entityId: user.id,
  };
}

export function saveSettings(ctx: Ctx, settings: CompanySettings) {
  requirePermission(ctx, "settings.manage");
  requireText(settings.companyName, "Informe a razão social.");
  record(ctx, {
    operation: "Configurações alteradas",
    entityType: "Configuração",
    entityId: "settings",
    entityLabel: "Empresa",
    description: settings.companyName,
    before: `Abaixo da referência: ${ctx.state.settings.allowBelowReference ? "sim" : "não"} · AO CONSUMIDOR: ${ctx.state.settings.allowGenericCustomer ? "sim" : "não"}`,
    after: `Abaixo da referência: ${settings.allowBelowReference ? "sim" : "não"} · AO CONSUMIDOR: ${settings.allowGenericCustomer ? "sim" : "não"}`,
  });
  return { state: finish(ctx, { settings: { ...settings } }), message: "Configurações salvas." };
}
