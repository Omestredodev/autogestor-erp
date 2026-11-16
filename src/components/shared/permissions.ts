import type { Permission } from "../../domain/types";
import { permissionLabel } from "../../domain/rules/permissions";
import { useStore } from "../../store/AppProvider";

export const NO_PERMISSION = "Seu perfil não possui permissão para esta ação.";

/** Returns a disabled-reason for a permission, or undefined when allowed. */
export function useDeny() {
  const { can, role } = useStore();
  return (permission: Permission) =>
    can(permission)
      ? undefined
      : `O perfil ${role.name} não possui a permissão "${permissionLabel(permission)}".`;
}
