import type {
  AppState,
  AuditEvent,
  ID,
  Permission,
  Product,
  Role,
  StockMovement,
  User,
} from "../types";
import { permissionLabel } from "../rules/permissions";

export class DomainError extends Error {}

export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DomainError(message);
}

export interface Ctx {
  state: AppState;
  now: string;
  user: User;
  role: Role;
  seq: Record<string, number>;
  audit: AuditEvent[];
}

export function createCtx(state: AppState, now: string): Ctx {
  const user = state.users.find((item) => item.id === state.session.userId);
  ensure(user, "Sessão inválida. Selecione um perfil de demonstração.");
  ensure(user.active, "O usuário da sessão está inativo.");
  const role = state.roles.find((item) => item.id === user.roleId);
  ensure(role, "Perfil do usuário não encontrado.");
  return { state, now, user, role, seq: { ...state.seq }, audit: [] };
}

export function requirePermission(ctx: Ctx, permission: Permission) {
  ensure(
    ctx.role.permissions.includes(permission),
    `O perfil ${ctx.role.name} não possui a permissão "${permissionLabel(permission)}".`,
  );
}

export function nextNumber(ctx: Ctx, key: string) {
  ctx.seq[key] = (ctx.seq[key] ?? 0) + 1;
  return ctx.seq[key];
}

export const newId = (ctx: Ctx, prefix: string) =>
  `${prefix}_${String(nextNumber(ctx, `id:${prefix}`)).padStart(5, "0")}`;

export function record(ctx: Ctx, event: Omit<AuditEvent, "id" | "at" | "userId" | "userName">) {
  ctx.audit.push({
    ...event,
    id: newId(ctx, "aud"),
    at: ctx.now,
    userId: ctx.user.id,
    userName: ctx.user.name,
  });
}

export function finish(ctx: Ctx, patch: Partial<AppState>): AppState {
  return { ...ctx.state, ...patch, seq: ctx.seq, audit: [...ctx.state.audit, ...ctx.audit] };
}

export const requireText = (value: string | undefined, message: string) => {
  ensure(value && value.trim().length > 0, message);
  return value.trim();
};

export const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0;

export interface StockChange {
  productId: ID;
  quantity: number;
  type: StockMovement["type"];
  refType: StockMovement["refType"];
  refId: ID;
  reason: string;
}

/** The only way stock balances change: product balance and movement are written together. */
export function applyStockChange(
  ctx: Ctx,
  products: Product[],
  movements: StockMovement[],
  change: StockChange,
) {
  const index = products.findIndex((product) => product.id === change.productId);
  ensure(index >= 0, "Produto não encontrado para movimentação de estoque.");
  const product = products[index];
  const balanceAfter = product.stock + change.quantity;
  ensure(
    Number.isInteger(change.quantity) && change.quantity !== 0,
    "Quantidade de movimentação inválida.",
  );
  ensure(balanceAfter >= 0, `Estoque insuficiente para ${product.code} — ${product.name}.`);
  products[index] = { ...product, stock: balanceAfter, updatedAt: ctx.now };
  movements.push({
    id: newId(ctx, "mov"),
    productId: product.id,
    type: change.type,
    quantity: change.quantity,
    balanceBefore: product.stock,
    balanceAfter,
    refType: change.refType,
    refId: change.refId,
    reason: change.reason,
    at: ctx.now,
    userId: ctx.user.id,
  });
}

export const describeProduct = (product: Product) => `${product.code} — ${product.name}`;
