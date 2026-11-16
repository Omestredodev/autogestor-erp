import type { AppState } from "../domain/types";
import type { Command } from "../domain/services/commands";
import { executeCommand } from "../domain/services";

export type StoreAction =
  /** Business command already validated by `executeCommand`; `now` keeps the transition deterministic. */
  { type: "command"; command: Command; now: string } | { type: "replace"; state: AppState };

export function appReducer(state: AppState, action: StoreAction): AppState {
  switch (action.type) {
    case "command": {
      const result = executeCommand(state, action.command, action.now);
      return result.ok ? result.state : state;
    }
    case "replace":
      return action.state;
  }
}
