import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppState, Permission, Role, User } from "../domain/types";
import type { Command, CommandResult } from "../domain/services/commands";
import { executeCommand } from "../domain/services";
import { appReducer } from "./reducer";
import { clearState, loadState, saveState, type LoadStatus } from "./persistence";
import { createSeedState } from "./seed";

interface StoreValue {
  state: AppState;
  user: User;
  role: Role;
  can: (permission: Permission) => boolean;
  run: (command: Command) => CommandResult;
  resetDemo: () => void;
  loadStatus: LoadStatus;
  storageAvailable: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

function initialize(): { state: AppState; status: LoadStatus } {
  const loaded = loadState();
  if (loaded.state) return { state: loaded.state, status: "restored" };
  return { state: createSeedState(), status: loaded.status };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(initialize);
  const [state, dispatch] = useReducer(appReducer, boot.state);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(boot.status);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setStorageAvailable(saveState(state));
  }, [state]);

  const run = useCallback((command: Command): CommandResult => {
    const now = new Date().toISOString();
    const result = executeCommand(stateRef.current, command, now);
    if (!result.ok) return result;
    // Keep the ref in sync so consecutive commands in the same tick see the new state.
    stateRef.current = result.state;
    dispatch({ type: "replace", state: result.state });
    return { ok: true, message: result.message, entityId: result.entityId };
  }, []);

  const resetDemo = useCallback(() => {
    clearState();
    const fresh = createSeedState();
    stateRef.current = fresh;
    dispatch({ type: "replace", state: fresh });
    setLoadStatus("empty");
  }, []);

  const value = useMemo<StoreValue>(() => {
    const user = state.users.find((item) => item.id === state.session.userId) ?? state.users[0];
    const role = state.roles.find((item) => item.id === user.roleId) ?? state.roles[0];
    return {
      state,
      user,
      role,
      can: (permission) => role.permissions.includes(permission),
      run,
      resetDemo,
      loadStatus,
      storageAvailable,
    };
  }, [state, run, resetDemo, loadStatus, storageAvailable]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside AppProvider");
  return context;
}
