export type {
  Command,
  CommandResult,
  ProductInput,
  PurchaseInput,
  SaleInput,
  CustomerInput,
  SupplierInput,
  ReminderInput,
  UserInput,
  PaymentTarget,
} from "../domain/services/commands";

let counter = 0;

/** Idempotency key for operations that must never be applied twice (e.g. sales). */
export const createRequestId = () =>
  `req-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
