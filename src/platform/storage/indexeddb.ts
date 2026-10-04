import type { Profile, ProfileStore, ProgressStore } from '../types';

const PROFILES = 'profiles';
const PROGRESS = 'progress';

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

export class IndexedDbStorage implements ProfileStore, ProgressStore {
  private constructor(private readonly db: IDBDatabase) {}

  static open(name = 'familiespellen'): Promise<IndexedDbStorage> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore(PROFILES, { keyPath: 'id' });
        // Sleutel [profileId, gameId]; losse velden voor het opruimen per profiel.
        db.createObjectStore(PROGRESS, { keyPath: ['profileId', 'gameId'] });
      };
      request.onsuccess = () => resolve(new IndexedDbStorage(request.result));
      request.onerror = () => reject(request.error);
    });
  }

  close(): void {
    this.db.close();
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
}
