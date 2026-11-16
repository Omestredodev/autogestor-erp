import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  Package,
  Search,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { canAccessPage, type Route } from "../../app/navigation/routes";
import { useStore } from "../../store/AppProvider";
import { brandName, customerName, supplierName } from "../../store/selectors";
import { matchesText } from "../../utils/calculations";
import { money } from "../../utils/currency";
import { formatDate } from "../../utils/dates";
import { saleGross } from "../../domain/rules/finance";

interface Result {
  key: string;
  group: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  route: Route;
}

const LIMIT = 5;

export function GlobalSearch() {
  const { state, can } = useStore();
  const { navigate } = useNavigation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    const onClick = (event: MouseEvent) =>
      !wrapRef.current?.contains(event.target as Node) && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    const list: Result[] = [];
    const add = (items: Result[]) => list.push(...items.slice(0, LIMIT));
    if (canAccessPage("products", can)) {
      add(
        state.products
          .filter((p) =>
            matchesText(
              q,
              p.code,
              p.manufacturerCode,
              p.ean,
              p.oemCode,
              p.name,
              brandName(state, p.brandId),
            ),
          )
          .map((p) => ({
            key: p.id,
            group: "Produtos",
            icon: Package,
            title: `${p.code} — ${p.name}`,
            subtitle: `${brandName(state, p.brandId)} · ${money(p.price)} · ${p.stock} un.${p.active ? "" : " · Inativo"}`,
            route: { page: "products", id: p.id },
          })),
      );
    }
    if (canAccessPage("clients", can)) {
      add(
        state.customers
          .filter(
            (c) => !c.generic && matchesText(q, c.name, c.document, c.phone, c.email, c.notes),
          )
          .map((c) => ({
            key: c.id,
            group: "Clientes",
            icon: Users,
            title: c.name,
            subtitle: `${c.document} · ${c.phone || c.email || c.type}`,
            route: { page: "clients", id: c.id },
          })),
      );
    }
    if (canAccessPage("sales", can)) {
      add(
        [...state.sales]
          .reverse()
          .filter((s) =>
            matchesText(
              q,
              s.number,
              s.customerName,
              s.sellerName,
              s.notes,
              ...s.items.flatMap((i) => [i.code, i.manufacturerCode, i.name]),
            ),
          )
          .map((s) => ({
            key: s.id,
            group: "Vendas",
            icon: ShoppingCart,
            title: `${s.number} · ${s.customerName}`,
            subtitle: `${formatDate(s.at)} · ${money(saleGross(s))}${s.status === "cancelled" ? " · Cancelada" : ""}${s.notes ? ` · ${s.notes}` : ""}`,
            route: { page: "sales", id: s.id },
          })),
      );
    }
    if (canAccessPage("suppliers", can)) {
      add(
        state.suppliers
          .filter((s) => matchesText(q, s.name, s.document, s.city, s.contact))
          .map((s) => ({
            key: s.id,
            group: "Fornecedores",
            icon: Building2,
            title: s.name,
            subtitle: `${s.document} · ${s.city}`,
            route: { page: "suppliers", id: s.id },
          })),
      );
    }
    if (canAccessPage("purchases", can)) {
      add(
        state.purchases
          .filter((p) =>
            matchesText(q, p.number, p.documentNumber, p.notes, supplierName(state, p.supplierId)),
          )
          .map((p) => ({
            key: p.id,
            group: "Compras",
            icon: Truck,
            title: `${p.number} · Doc. ${p.documentNumber}`,
            subtitle: supplierName(state, p.supplierId),
            route: { page: "purchases", id: p.id },
          })),
      );
    }
    if (canAccessPage("closings", can)) {
      add(
        state.closings
          .filter((c) => matchesText(q, c.number, customerName(state, c.customerId), c.notes))
          .map((c) => ({
            key: c.id,
            group: "Fechamentos",
            icon: ClipboardCheck,
            title: c.number,
            subtitle: customerName(state, c.customerId),
            route: { page: "closings", id: c.id },
          })),
      );
    }
    if (canAccessPage("reminders", can)) {
      add(
        state.reminders
          .filter((r) => matchesText(q, r.title, r.description))
          .map((r) => ({
            key: r.id,
            group: "Lembretes",
            icon: CalendarClock,
            title: r.title,
            subtitle: formatDate(r.dueAt),
            route: { page: "reminders", params: { focus: r.id } },
          })),
      );
    }
    return list;
  }, [query, state, can]);

  useEffect(() => setActive(0), [query]);

  const select = (result: Result) => {
    navigate(result.route);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => Math.min(results.length - 1, value + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => Math.max(0, value - 1));
    } else if (event.key === "Enter" && results[active]) {
      select(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  let lastGroup = "";
  return (
    <div className="global-search-wrap" ref={wrapRef}>
      <label className="global-search">
        <Search size={18} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Pesquisar produtos, vendas, clientes..."
          aria-label="Pesquisa global"
          role="combobox"
          aria-expanded={open && query.length >= 2}
          aria-controls="global-search-results"
        />
        <kbd>{isMac ? "⌘ K" : "Ctrl K"}</kbd>
      </label>
      {open && query.trim().length >= 2 && (
        <div className="search-results" id="global-search-results" role="listbox">
          {results.length === 0 ? (
            <div className="search-empty">
              <Search size={20} />
              <strong>Nenhum resultado para “{query}”</strong>
              <span>Tente código interno, código do fabricante, EAN, nome ou número da venda.</span>
            </div>
          ) : (
            results.map((result, index) => {
              const header = result.group !== lastGroup ? result.group : null;
              lastGroup = result.group;
              const Icon = result.icon;
              return (
                <div key={`${result.group}-${result.key}`}>
                  {header && <div className="search-group">{header}</div>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    className={index === active ? "active" : ""}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => select(result)}
                  >
                    <span>
                      <Icon size={16} />
                    </span>
                    <div>
                      <strong>{result.title}</strong>
                      <small>{result.subtitle}</small>
                    </div>
                  </button>
                </div>
              );
            })
          )}
          <div className="search-footer">↑↓ navegar · Enter abrir · Esc fechar</div>
        </div>
      )}
    </div>
  );
}
