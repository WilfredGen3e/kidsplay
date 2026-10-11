import {
  INDEX_PATH,
  entryPath,
  generateCode,
  newEntryId,
  type LibraryEntry,
  type LibraryIndex,
} from './library';

/** Eén bestand in één commit; `content: null` verwijdert het bestand. */
export interface RepoFile {
  path: string;
  content: Blob | string | null;
}

/** Wat de beheerconsole nodig heeft van GitHub; de echte versie staat in `src/beheer/github.ts`. */
export interface RepoWriter {
  /** Actuele lijst, rechtstreeks van de branch (niet uit de cache van raw.githubusercontent.com). */
  readIndex(): Promise<LibraryEntry[]>;
  /** Alle bestanden in één commit, zodat lijst en foto's nooit uit de pas lopen. */
  commit(files: RepoFile[], message: string): Promise<void>;
}

export interface NewPhoto {
  name: string;
  pieceOptions: number[];
  image: Blob;
  thumb: Blob;
}

const indexFile = (entries: LibraryEntry[]): RepoFile => ({
  path: INDEX_PATH,
  content: JSON.stringify({ version: 1, entries } satisfies LibraryIndex, null, 2) + '\n',
});

const entryFile = (entry: LibraryEntry): RepoFile => ({
  path: entryPath(entry.code, 'puzzle.json'),
  content: JSON.stringify(entry, null, 2) + '\n',
});

/** Zet een foto in de bibliotheek en geeft de nieuwe code terug. */
export async function publishPhoto(repo: RepoWriter, photo: NewPhoto, now = new Date()): Promise<LibraryEntry> {
  const entries = await repo.readIndex();
  const code = generateCode(entries.map((e) => e.code));
  const entry: LibraryEntry = {
    id: newEntryId(code, now.getTime()),
    code,
    name: photo.name.trim(),
    pieceOptions: [...photo.pieceOptions].sort((a, b) => a - b),
    createdAt: now.toISOString(),
  };
  await repo.commit(
    [
      { path: entryPath(code, 'foto.jpg'), content: photo.image },
      { path: entryPath(code, 'thumb.jpg'), content: photo.thumb },
      entryFile(entry),
      indexFile([entry, ...entries]),
    ],
    `Foto ${code}: ${entry.name}`,
  );
  return entry;
}

/** Past naam en aantallen aan; de foto en de code blijven gelijk. */
export async function updatePhoto(
  repo: RepoWriter,
  code: string,
  changes: Pick<LibraryEntry, 'name' | 'pieceOptions'>,
): Promise<LibraryEntry> {
  const entries = await repo.readIndex();
  const current = entries.find((e) => e.code === code);
  if (!current) throw new Error(`Code ${code} bestaat niet meer`);
  const entry: LibraryEntry = {
    ...current,
    name: changes.name.trim(),
    pieceOptions: [...changes.pieceOptions].sort((a, b) => a - b),
  };
  await repo.commit([entryFile(entry), indexFile(entries.map((e) => (e.code === code ? entry : e)))], `Foto ${code} gewijzigd`);
  return entry;
}

/** Haalt de foto uit de bibliotheek. Apparaten die hem al hebben, houden hem; de git-geschiedenis ook. */
export async function deletePhoto(repo: RepoWriter, code: string): Promise<void> {
  const entries = await repo.readIndex();
  if (!entries.some((e) => e.code === code)) return;
  await repo.commit(
    [
      { path: entryPath(code, 'foto.jpg'), content: null },
      { path: entryPath(code, 'thumb.jpg'), content: null },
      { path: entryPath(code, 'puzzle.json'), content: null },
      indexFile(entries.filter((e) => e.code !== code)),
    ],
    `Foto ${code} verwijderd`,
  );
}
