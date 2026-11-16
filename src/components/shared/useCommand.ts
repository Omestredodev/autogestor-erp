import { useCallback, useRef, useState } from "react";
import type { Command } from "../../store/actions";
import { useStore } from "../../store/AppProvider";
import { useToast } from "./Toast";

interface Options {
  onSuccess?: (entityId: string | undefined, message: string) => void;
  /** Suppress the success toast (e.g. when a receipt is shown instead). */
  silent?: boolean;
}

/**
 * Runs a business command with a short processing state so confirmation buttons
 * are disabled while processing and cannot submit twice.
 */
export function useCommand() {
  const { run } = useStore();
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);

  const execute = useCallback(
    (command: Command, options: Options = {}) => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setError(null);
      window.setTimeout(() => {
        const result = run(command);
        lock.current = false;
        setBusy(false);
        if (result.ok) {
          if (!options.silent) notify(result.message, "success");
          options.onSuccess?.(result.entityId, result.message);
        } else {
          setError(result.error);
          notify(result.error, "error");
        }
      }, 250);
    },
    [run, notify],
  );

  return { execute, busy, error, setError };
}
