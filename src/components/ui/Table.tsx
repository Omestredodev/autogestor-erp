import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function DataTable({
  headers,
  children,
  className = "",
}: {
  headers: ReactNode[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`table-wrap ${className}`}>
      <table>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );
  return { page: Math.min(page, pages), setPage, pages, pageItems, total: items.length, pageSize };
}

export function Pagination({
  page,
  pages,
  total,
  pageSize,
  setPage,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  setPage: (page: number) => void;
}) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const visible = Array.from({ length: pages }, (_, index) => index + 1).filter(
    (value) => value === 1 || value === pages || Math.abs(value - page) <= 1,
  );
  return (
    <div className="pagination">
      <span>
        Mostrando {start}–{end} de {total}
      </span>
      <div>
        <button
          type="button"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        {visible.map((value, index) => (
          <span key={value} className="page-group">
            {index > 0 && value - visible[index - 1] > 1 && <span>…</span>}
            <button
              type="button"
              className={value === page ? "active" : ""}
              onClick={() => setPage(value)}
              aria-current={value === page ? "page" : undefined}
            >
              {value}
            </button>
          </span>
        ))}
        <button
          type="button"
          disabled={page === pages}
          onClick={() => setPage(page + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
