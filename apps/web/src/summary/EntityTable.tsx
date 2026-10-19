// Lista virtualizada de entidades (TanStack Virtual, D54): miles de filas, orden por columna, cada
// fila y cada enlace abre la ficha. Sin búsqueda (es de la enciclopedia, P11).
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EntityLink } from '../entity/EntityLink';
import type { EntityRef } from '../worker/sim-protocol';

export interface Cell {
  readonly text: string;
  /** Valor para ordenar (número o texto). */
  readonly sort: number | string;
  /** Si la celda nombra una entidad, enlaza a su ficha. */
  readonly ref?: EntityRef;
}

export interface Column {
  readonly label: string;
}

export interface TableRow {
  readonly key: string;
  readonly cells: readonly Cell[];
}

/** Alto de una fila (px CSS). */
const ROW_PX = 28;

export function EntityTable({
  columns,
  rows,
}: {
  readonly columns: readonly Column[];
  readonly rows: readonly TableRow[];
}) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 }>({ col: 0, dir: 1 });
  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const x = a.cells[sort.col]?.sort ?? 0;
      const y = b.cells[sort.col]?.sort ?? 0;
      const c =
        typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return c * sort.dir || a.key.localeCompare(b.key);
    });
    return out;
  }, [rows, sort]);
  const parent = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual no es compatible con el compilador de React; no se usa
  const virtual = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parent.current,
    estimateSize: () => ROW_PX,
    overscan: 12,
  });
  const template = `repeat(${columns.length}, minmax(0, 1fr))`;
  return (
    <div className="entity-table">
      <div className="thead" style={{ gridTemplateColumns: template }} role="row">
        {columns.map((c, i) => (
          <button
            key={c.label}
            type="button"
            role="columnheader"
            aria-sort={sort.col === i ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
            onClick={() => {
              setSort((s) => ({ col: i, dir: s.col === i ? (s.dir === 1 ? -1 : 1) : 1 }));
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      {sorted.length === 0 ? (
        <p className="meta">{t('ui.summary.empty')}</p>
      ) : (
        <div className="tbody" ref={parent}>
          <div style={{ height: virtual.getTotalSize(), position: 'relative' }}>
            {virtual.getVirtualItems().map((item) => {
              const row = sorted[item.index];
              if (!row) return null;
              return (
                <div
                  key={row.key}
                  className="tr"
                  role="row"
                  style={{
                    gridTemplateColumns: template,
                    transform: `translateY(${item.start}px)`,
                    height: ROW_PX,
                  }}
                >
                  {row.cells.map((cell, i) => (
                    <span key={i} role="cell">
                      {cell.ref ? (
                        <EntityLink entity={cell.ref} density="page">
                          {cell.text}
                        </EntityLink>
                      ) : (
                        cell.text
                      )}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <p className="meta">{t('ui.summary.rows', { count: sorted.length })}</p>
    </div>
  );
}
