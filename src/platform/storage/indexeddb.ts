import type { Profile, ProfileStore, ProgressStore, RecordStore } from '../types';

const PROFILES = 'profiles';
const PROGRESS = 'progress';
const RECORDS = 'records';

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Ruwe rijen zoals ze in IndexedDB staan. */
export interface RawData {
  profiles: unknown[];
  progress: unknown[];
  records: unknown[];
}

export class IndexedDbStorage implements ProfileStore, ProgressStore {
  private constructor(private readonly db: IDBDatabase) {}

  static open(name = 'familiespellen'): Promise<IndexedDbStorage> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PROFILES)) db.createObjectStore(PROFILES, { keyPath: 'id' });
        // Sleutel [profileId, gameId]; losse velden voor het opruimen per profiel.
        if (!db.objectStoreNames.contains(PROGRESS)) db.createObjectStore(PROGRESS, { keyPath: ['profileId', 'gameId'] });
        // Versie 2: spelgegevens zoals puzzels, met sleutel [gameId, collection, id].
        if (!db.objectStoreNames.contains(RECORDS)) db.createObjectStore(RECORDS, { keyPath: ['gameId', 'collection', 'id'] });
      };
      request.onsuccess = () => resolve(new IndexedDbStorage(request.result));
      request.onerror = () => reject(request.error);
    });
  }

  close(): void {
    this.db.close();
  }

  /** Alle rijen van alle opslagplekken, voor een back-up. */
  async dumpAll(): Promise<RawData> {
    const tx = this.db.transaction([PROFILES, PROGRESS, RECORDS]);
    const [profiles, progress, records] = await Promise.all(
      [PROFILES, PROGRESS, RECORDS].map((name) => promisify(tx.objectStore(name).getAll())),
    );
    return { profiles, progress, records };
  }

  /** Wist alles en zet de rijen terug, in één transactie (alles of niets). */
  async replaceAll(data: RawData): Promise<void> {
    const tx = this.db.transaction([PROFILES, PROGRESS, RECORDS], 'readwrite');
    for (const [name, rows] of [[PROFILES, data.profiles], [PROGRESS, data.progress], [RECORDS, data.records]] as const) {
      const store = tx.objectStore(name);
      store.clear();
      for (const row of rows) store.put(row);
    }
    await done(tx);
  }

  list(): Promise<Profile[]> {
    return promisify(this.db.transaction(PROFILES).objectStore(PROFILES).getAll());
  }

  get(id: string): Promise<Profile | undefined> {
    return promisify(this.db.transaction(PROFILES).objectStore(PROFILES).get(id));
  }

  async put(profile: Profile): Promise<void> {
    const tx = this.db.transaction(PROFILES, 'readwrite');
    tx.objectStore(PROFILES).put(profile);
    await done(tx);
  }

  async remove(id: string): Promise<void> {
    const tx = this.db.transaction([PROFILES, PROGRESS], 'readwrite');
    tx.objectStore(PROFILES).delete(id);
    // Alle voortgang van dit profiel: sleutels [id, ...] vallen tussen [id] en [id, []].
    tx.objectStore(PROGRESS).delete(IDBKeyRange.bound([id], [id, []]));
    await done(tx);
  }

  async load<T>(profileId: string, gameId: string): Promise<T | undefined> {
    const row = await promisify(
      this.db.transaction(PROGRESS).objectStore(PROGRESS).get([profileId, gameId]),
    );
    return row?.data as T | undefined;
  }

  async save<T>(profileId: string, gameId: string, data: T): Promise<void> {
    const tx = this.db.transaction(PROGRESS, 'readwrite');
    tx.objectStore(PROGRESS).put({ profileId, gameId, data });
    await done(tx);
  }

  /** Spelgegevens (puzzels e.d.), los van profielen en voortgang. */
  readonly records: RecordStore = {
    list: async <T>(gameId: string, collection: string) => {
      const range = IDBKeyRange.bound([gameId, collection], [gameId, collection, []]);
      const rows = await promisify(this.db.transaction(RECORDS).objectStore(RECORDS).getAll(range));
      return rows.map((r) => r.value as T);
    },
    get: async <T>(gameId: string, collection: string, id: string) => {
      const row = await promisify(this.db.transaction(RECORDS).objectStore(RECORDS).get([gameId, collection, id]));
      return row?.value as T | undefined;
    },
    put: async <T>(gameId: string, collection: string, id: string, value: T) => {
      const tx = this.db.transaction(RECORDS, 'readwrite');
      tx.objectStore(RECORDS).put({ gameId, collection, id, value });
      await done(tx);
    },
    remove: async (gameId: string, collection: string, id: string) => {
      const tx = this.db.transaction(RECORDS, 'readwrite');
      tx.objectStore(RECORDS).delete([gameId, collection, id]);
      await done(tx);
    },
  };
}
