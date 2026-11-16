import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Overlay, Route } from "./routes";

interface NavigationValue {
  route: Route;
  navigate: (route: Route) => void;
  /** Updates the current entry (e.g. tab changes) without growing history. */
  replace: (route: Route) => void;
  back: () => void;
  canGoBack: boolean;
  overlay: Overlay | null;
  open: (overlay: Overlay) => void;
  close: () => void;
}

const NavigationContext = createContext<NavigationValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<Route[]>([{ page: "dashboard" }]);
  const [overlay, setOverlay] = useState<Overlay | null>(null);

  const navigate = useCallback((route: Route) => {
    setHistory((current) => [...current.slice(-30), route]);
    window.scrollTo({ top: 0 });
  }, []);
  const replace = useCallback(
    (route: Route) => setHistory((current) => [...current.slice(0, -1), route]),
    [],
  );
  const back = useCallback(
    () => setHistory((current) => (current.length > 1 ? current.slice(0, -1) : current)),
    [],
  );
  const close = useCallback(() => setOverlay(null), []);

  const value = useMemo(
    () => ({
      route: history[history.length - 1],
      navigate,
      replace,
      back,
      canGoBack: history.length > 1,
      overlay,
      open: setOverlay,
      close,
    }),
    [history, navigate, replace, back, overlay, close],
  );
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useNavigation must be used inside NavigationProvider");
  return context;
}
