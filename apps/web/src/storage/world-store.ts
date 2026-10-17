// Mundos guardados (P1.5, Δ de P1.4): guardar = los bytes del `.wsim` (un solo formato para
// guardar, exportar e importar) + metadatos para listarlos sin leer los archivos. Sin backend:
// IndexedDB del navegador. La interfaz permite probar la lógica en Node con la versión en memoria.
import type { WorldParams } from '@ws/worldgen';

export interface SavedWorld {
  readonly id: number;
  readonly params: WorldParams;
  readonly worldHash: string;
  readonly engineVersion: string;
  /** Años simulados (count). */
  readonly years: number;
  /** Último año simulado (calendario). */
  readonly lastYear: number;
  /** Momento del guardado (ms desde 1970, reloj del navegador). */
  readonly savedAt: number;
  /** Tamaño del archivo (bytes). */
  readonly size: number;
}

export type NewSavedWorld = Omit<SavedWorld, 'id'>;

export interface WorldStore {
  /** Del más reciente al más viejo. */
  list(): Promise<SavedWorld[]>;
  save(meta: NewSavedWorld, file: Uint8Array): Promise<number>;
  load(id: number): Promise<{ readonly meta: SavedWorld; readonly file: Uint8Array } | null>;
  remove(id: number): Promise<void>;
}

const newestFirst = (a: SavedWorld, b: SavedWorld) => b.savedAt - a.savedAt || b.id - a.id;

export class MemoryWorldStore implements WorldStore {
  private readonly worlds = new Map<number, { meta: SavedWorld; file: Uint8Array }>();
  private nextId = 1;

  list(): Promise<SavedWorld[]> {
    return Promise.resolve([...this.worlds.values()].map((w) => w.meta).sort(newestFirst));
  }

  save(meta: NewSavedWorld, file: Uint8Array): Promise<number> {
    const id = this.nextId++;
    this.worlds.set(id, { meta: { ...meta, id }, file: file.slice() });
    return Promise.resolve(id);
  }

  load(id: number) {
    const w = this.worlds.get(id);
    return Promise.resolve(w ? { meta: w.meta, file: w.file.slice() } : null);
  }

  remove(id: number): Promise<void> {
    this.worlds.delete(id);
    return Promise.resolve();
  }
}

const DB_NAME = 'worldsim2';
const DB_VERSION = 1;
const META = 'worlds';
const FILES = 'files';

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB: pedido fallido'));
    };
  });
}

function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error('IndexedDB: transacción fallida'));
    };
    tx.onabort = () => {
      reject(tx.error ?? new Error('IndexedDB: transacción abortada'));
    };
  });
}

export class IndexedDbWorldStore implements WorldStore {
  private db: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(META)) {
          db.createObjectStore(META, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB: no se pudo abrir'));
      };
    });
    return this.db;
  }

  async list(): Promise<SavedWorld[]> {
    const db = await this.open();
    const all = await done(
      db.transaction(META).objectStore(META).getAll() as IDBRequest<SavedWorld[]>,
    );
    return all.sort(newestFirst);
  }

  async save(meta: NewSavedWorld, file: Uint8Array): Promise<number> {
    const db = await this.open();
    const tx = db.transaction([META, FILES], 'readwrite');
    const ok = finished(tx);
    // Con keyPath + autoIncrement, IndexedDB escribe el id generado dentro del registro.
    const id = Number(await done(tx.objectStore(META).add(meta)));
    tx.objectStore(FILES).put(file, id);
    await ok;
    return id;
  }

  async load(id: number) {
    const db = await this.open();
    const tx = db.transaction([META, FILES]);
    const [meta, file] = await Promise.all([
      done(tx.objectStore(META).get(id) as IDBRequest<SavedWorld | undefined>),
      done(tx.objectStore(FILES).get(id) as IDBRequest<Uint8Array | undefined>),
    ]);
    return meta && file ? { meta, file } : null;
  }

  async remove(id: number): Promise<void> {
    const db = await this.open();
    const tx = db.transaction([META, FILES], 'readwrite');
    tx.objectStore(META).delete(id);
    tx.objectStore(FILES).delete(id);
    await finished(tx);
  }
}

/** El store del navegador; en memoria si no hay IndexedDB (modo privado de algunos navegadores). */
export function createWorldStore(): WorldStore {
  return typeof indexedDB === 'undefined' ? new MemoryWorldStore() : new IndexedDbWorldStore();
}
