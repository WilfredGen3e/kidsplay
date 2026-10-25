/**
 * Meetgegevens van grote puzzels op dit apparaat, voor de ouder: hoe lang het laden duurde en hoeveel
 * geheugen de stukjes innemen. Daarnaast een "bezig"-merk: staat dat er bij het volgende opstarten nog,
 * dan is de app midden in een grote puzzel gestopt (waarschijnlijk te weinig geheugen).
 */
export type MetingStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface Measurement {
  pieces: number;
  loadMs: number;
  /** Schatting: breedte × hoogte × 4 bytes van alle stukjes. */
  bitmapMb: number;
  heapMb?: number;
  at: string;
}

export interface CrashNote {
  pieces: number;
  at: string;
}

const LAST_KEY = 'kidsplay-meting';
const BUSY_KEY = 'kidsplay-meting-bezig';
const CRASH_KEY = 'kidsplay-meting-gestopt';

export function browserStore(): MetingStore | undefined {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
}

function readJson<T>(store: MetingStore, key: string): T | undefined {
  try {
    const text = store.getItem(key);
    return text ? (JSON.parse(text) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeJson(store: MetingStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Zonder opslag is er geen meting; het spel werkt gewoon door.
  }
}

export function bitmapMegabytes(canvases: Iterable<{ width: number; height: number }>): number {
  let pixels = 0;
  for (const c of canvases) pixels += c.width * c.height;
  return Math.round((pixels * 4) / 1048576);
}

export const saveMeasurement = (store: MetingStore, m: Measurement) => writeJson(store, LAST_KEY, m);
export const readMeasurement = (store: MetingStore) => readJson<Measurement>(store, LAST_KEY);

/** Er staat nu een grote puzzel open. */
export function markBusy(store: MetingStore, pieces: number, now = new Date()): void {
  writeJson(store, BUSY_KEY, { pieces, at: now.toISOString() } satisfies CrashNote);
}

/** De puzzel is netjes gesloten (of de app is naar de achtergrond gegaan). */
export function clearBusy(store: MetingStore): void {
  try {
    store.removeItem(BUSY_KEY);
  } catch {
    // negeren
  }
}

/**
 * Staat er nog een "bezig"-merk van een vorige keer, dan is de app daar abrupt gestopt: bewaar dat als
 * melding. Geeft de melding terug (nieuw of eerder bewaard), of niets.
 */
export function collectCrash(store: MetingStore): CrashNote | undefined {
  const busy = readJson<CrashNote>(store, BUSY_KEY);
  if (busy) {
    writeJson(store, CRASH_KEY, busy);
    clearBusy(store);
  }
  return readJson<CrashNote>(store, CRASH_KEY);
}

export function clearCrash(store: MetingStore): void {
  try {
    store.removeItem(CRASH_KEY);
  } catch {
    // negeren
  }
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0).replace('.', ',')} s`;

export function describeMeasurement(m: Measurement): string {
  const parts = [`${m.pieces} stukjes`, `geladen in ${seconds(m.loadMs)}`, `stukjes ≈ ${m.bitmapMb} MB`];
  if (m.heapMb !== undefined) parts.push(`JS-geheugen ${m.heapMb} MB`);
  return parts.join(' · ');
}
