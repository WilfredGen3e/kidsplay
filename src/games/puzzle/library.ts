import type { GameData } from '../../platform/types';
import type { Puzzle } from './model';

/** Waar de gedeelde foto's staan: een aparte branch, zodat de Pages-workflow niet opnieuw bouwt. */
export interface LibraryRepo {
  owner: string;
  repo: string;
  branch: string;
}

export const LIBRARY_REPO: LibraryRepo = { owner: 'WilfredGen3e', repo: 'kidsplay', branch: 'fotos' };

/** Eén gedeelde foto met haar kenmerken; staat in `codes/<code>/puzzle.json` én in `index.json`. */
export interface LibraryEntry {
  /** Vast en uniek, ook als een code later opnieuw wordt gebruikt: `lib-<code>-<tijd>`. */
  id: string;
  code: string;
  name: string;
  pieceOptions: number[];
  createdAt: string;
}

export interface LibraryIndex {
  version: 1;
  entries: LibraryEntry[];
}

export type Fetcher = typeof fetch;

export const CODE_LENGTH = 5;
export const INDEX_PATH = 'index.json';

export const entryPath = (code: string, file: 'puzzle.json' | 'foto.jpg' | 'thumb.jpg') => `codes/${code}/${file}`;

export function isValidCode(code: string): boolean {
  return /^\d{5}$/.test(code);
}

/** Alleen cijfers; handig voor een invoerveld dat spaties of streepjes toelaat. */
export function normalizeCode(input: string): string {
  return input.replace(/\D/g, '');
}

/** Kiest een nog niet gebruikte code van 5 cijfers. */
export function generateCode(taken: Iterable<string>, random: () => number = secureRandom): string {
  const used = new Set(taken);
  if (used.size >= 10 ** CODE_LENGTH) throw new Error('Alle codes zijn in gebruik');
  for (;;) {
    const code = String(Math.floor(random() * 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
    if (!used.has(code)) return code;
  }
}

function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export function newEntryId(code: string, now = Date.now()): string {
  return `lib-${code}-${now.toString(36)}`;
}

export function rawUrl(path: string, repo: LibraryRepo = LIBRARY_REPO, bust = false): string {
  const url = `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.branch}/${path}`;
  // raw.githubusercontent.com cachet een paar minuten; een parameter voorkomt een verouderde lijst.
  return bust ? `${url}?t=${Date.now()}` : url;
}

function isEntry(value: unknown): value is LibraryEntry {
  const e = value as Partial<LibraryEntry> | null;
  return (
    !!e &&
    typeof e.id === 'string' &&
    typeof e.code === 'string' &&
    isValidCode(e.code) &&
    typeof e.name === 'string' &&
    Array.isArray(e.pieceOptions) &&
    e.pieceOptions.every((n) => typeof n === 'number') &&
    typeof e.createdAt === 'string'
  );
}

/** Alle gedeelde foto's, nieuwste eerst. Geen branch of lijst (404) is een lege bibliotheek. */
export async function fetchIndex(fetcher: Fetcher = fetch, repo: LibraryRepo = LIBRARY_REPO): Promise<LibraryEntry[]> {
  const response = await fetcher(rawUrl(INDEX_PATH, repo, true));
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Bibliotheek ophalen mislukt (${response.status})`);
  const index = (await response.json()) as Partial<LibraryIndex>;
  const entries = Array.isArray(index.entries) ? index.entries.filter(isEntry) : [];
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Zoekt één foto op code; `undefined` als de code niet bestaat. */
export async function fetchEntry(code: string, fetcher: Fetcher = fetch, repo: LibraryRepo = LIBRARY_REPO): Promise<LibraryEntry | undefined> {
  if (!isValidCode(code)) return undefined;
  const response = await fetcher(rawUrl(entryPath(code, 'puzzle.json'), repo, true));
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Code opzoeken mislukt (${response.status})`);
  const entry: unknown = await response.json();
  return isEntry(entry) ? entry : undefined;
}

async function fetchBlob(path: string, fetcher: Fetcher, repo: LibraryRepo): Promise<Blob> {
  const response = await fetcher(rawUrl(path, repo));
  if (!response.ok) throw new Error(`Foto ophalen mislukt (${response.status})`);
  return response.blob();
}

/** Welke bibliotheekfoto's staan al als puzzel op dit apparaat (op id)? */
export async function importedIds(data: GameData): Promise<Set<string>> {
  const puzzles = await data.list<Puzzle>('puzzles');
  return new Set(puzzles.map((p) => p.id));
}

/**
 * Haalt de foto op en maakt er een gewone puzzel van, zichtbaar voor iedereen.
 * Heeft het apparaat de foto al, dan gebeurt er niets (geen dubbele puzzel).
 */
export async function importEntry(
  data: GameData,
  entry: LibraryEntry,
  fetcher: Fetcher = fetch,
  repo: LibraryRepo = LIBRARY_REPO,
): Promise<'toegevoegd' | 'bestond al'> {
  if (await data.get<Puzzle>('puzzles', entry.id)) return 'bestond al';
  const [image, thumb] = await Promise.all([
    fetchBlob(entryPath(entry.code, 'foto.jpg'), fetcher, repo),
    fetchBlob(entryPath(entry.code, 'thumb.jpg'), fetcher, repo),
  ]);
  const puzzle: Puzzle = {
    id: entry.id,
    name: entry.name,
    image,
    thumb,
    pieceOptions: entry.pieceOptions,
    visibleFor: 'all',
    createdAt: entry.createdAt,
  };
  await data.put('puzzles', puzzle.id, puzzle);
  return 'toegevoegd';
}

export interface ImportSummary {
  added: number;
  skipped: number;
  failed: number;
}

/** Voegt alles toe wat nog ontbreekt; een mislukte foto stopt de rest niet. */
export async function importAll(
  data: GameData,
  entries: LibraryEntry[],
  fetcher: Fetcher = fetch,
  repo: LibraryRepo = LIBRARY_REPO,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportSummary> {
  const summary: ImportSummary = { added: 0, skipped: 0, failed: 0 };
  let done = 0;
  for (const entry of entries) {
    try {
      const result = await importEntry(data, entry, fetcher, repo);
      if (result === 'toegevoegd') summary.added++;
      else summary.skipped++;
    } catch {
      summary.failed++;
    }
    onProgress?.(++done, entries.length);
  }
  return summary;
}

