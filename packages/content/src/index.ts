// Contenido del motor (docs/model.md §15). El hash de contenido va en la cabecera de snapshots y
// `.wsim`: un seed reproduce el mismo mundo solo con el mismo motor y el mismo contenido.
import { hash } from '@ws/core';
import { canonicalJson } from './canonical';
import type { ContentRow, ContentTable } from './table';
import { Laws, Strata } from './tables/society';
import { MapTypes, WorldSizes } from './tables/world';

export { canonicalJson } from './canonical';
export { ContentError, type ContentRow, type ContentTable, defineTable } from './table';
export { Laws, Strata } from './tables/society';
export { MapTypes, WorldSizes } from './tables/world';

/** Todas las tablas, en orden fijo (el del hash). Cada tabla nueva se agrega acá. */
export const CONTENT_TABLES: readonly ContentTable<ContentRow>[] = Object.freeze([
  WorldSizes,
  MapTypes,
  Strata,
  Laws,
]);

/** Hash de 64 bits (16 hex) del JSON canónico de todas las tablas. */
export function contentHash(tables: readonly ContentTable<ContentRow>[] = CONTENT_TABLES): string {
  const doc = tables.map((t) => ({ name: t.name, rows: t.rows }));
  return hash.hash64(hash.utf8(canonicalJson(doc)));
}

export const CONTENT_HASH = contentHash();
