import type { AppState } from "../types";
import type { Command } from "./commands";
import { createCtx, DomainError, type Ctx } from "./core";
import {
  createApplication,
  createEquivalence,
  removeApplication,
  removeEquivalence,
  saveProduct,
  toggleProduct,
} from "./catalog";
import { adjustStock, confirmPurchase, discardPurchase, savePurchase } from "./inventory";
import {
  cancelSale,
  createClosing,
  createSale,
  registerPayment,
  registerRefund,
  returnSale,
} from "./sales";
import { saveCustomer, saveSupplier, toggleCustomer, toggleSupplier } from "./parties";
import {
  postponeReminder,
  saveReminder,
  saveSettings,
  saveUser,
  setReminderStatus,
  switchRole,
  toggleUser,
  updateRole,
} from "./productivity";

export type { Command, CommandResult } from "./commands";
export { DomainError } from "./core";

export type ExecuteResult =
  | { ok: true; state: AppState; message: string; entityId?: string }
  | { ok: false; error: string };

type Handler = { state: AppState; message: string; entityId?: string };

function dispatchCommand(ctx: Ctx, command: Command): Handler {
  switch (command.type) {
    case "product.save":
      return saveProduct(ctx, command.id, command.input);
    case "product.toggleActive":
      return toggleProduct(ctx, command.id);
    case "purchase.save":
      return savePurchase(ctx, command.id, command.input, command.confirm);
    case "purchase.confirm":
      return confirmPurchase(ctx, command.id);
    case "purchase.discard":
      return discardPurchase(ctx, command.id);
    case "stock.adjust":
      return adjustStock(ctx, command.productId, command.newQuantity, command.reason);
    case "sale.create":
      return createSale(ctx, command.input);
    case "sale.cancel":
      return cancelSale(ctx, command.saleId, command.reason);
    case "sale.return":
      return returnSale(ctx, command.saleId, command.reason, command.items);
    case "payment.register":
      return registerPayment(ctx, command.target, command.amount, command.method, command.notes);
    case "payment.refund":
      return registerRefund(ctx, command.target, command.amount, command.method, command.notes);
    case "customer.save":
      return saveCustomer(ctx, command.id, command.input);
    case "customer.toggleActive":
      return toggleCustomer(ctx, command.id);
    case "supplier.save":
      return saveSupplier(ctx, command.id, command.input);
    case "supplier.toggleActive":
      return toggleSupplier(ctx, command.id);
    case "closing.create":
      return createClosing(
        ctx,
        command.customerId,
        command.saleIds,
        command.dueDate,
        command.notes,
      );
    case "application.create":
      return createApplication(ctx, command.productId, command.vehicleId, command.notes);
    case "application.remove":
      return removeApplication(ctx, command.id);
    case "equivalence.create":
      return createEquivalence(ctx, command.productAId, command.productBId, command.notes);
    case "equivalence.remove":
      return removeEquivalence(ctx, command.id);
    case "reminder.save":
      return saveReminder(ctx, command.id, command.input);
    case "reminder.setStatus":
      return setReminderStatus(ctx, command.id, command.status);
    case "reminder.postpone":
      return postponeReminder(ctx, command.id, command.minutes);
    case "user.save":
      return saveUser(ctx, command.id, command.input);
    case "user.toggleActive":
      return toggleUser(ctx, command.id);
    case "role.update":
      return updateRole(ctx, command.roleId, command.permissions);
    case "session.switchRole":
      return switchRole(ctx, command.roleId);
    case "settings.save":
      return saveSettings(ctx, command.settings);
  }
}

/**
 * Pure, deterministic transition: validates, then returns the whole next state.
 * Either every related entity changes together or nothing changes.
 */
export function executeCommand(state: AppState, command: Command, now: string): ExecuteResult {
  try {
    const ctx = createCtx(state, now);
    const result = dispatchCommand(ctx, command);
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, error: error.message };
    console.error(error);
    return {
      ok: false,
      error: "Erro inesperado ao processar a operação. Nenhum dado foi alterado.",
    };
  }
}
