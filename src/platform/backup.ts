import type { IndexedDbStorage, RawData } from './storage/indexeddb';

export const BACKUP_FORMAT = 'familiespellen-backup';
export const BACKUP_VERSION = 1;

export interface BackupFile extends RawData {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
}

/** Een Blob in JSON: type en inhoud als base64. */
interface BlobMarker {
  __blob: string;
  type: string;
}

const isMarker = (v: unknown): v is BlobMarker =>
  typeof v === 'object' && v !== null && typeof (v as BlobMarker).__blob === 'string' && typeof (v as BlobMarker).type === 'string';

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Zet Blobs (ook diep in een object) om naar JSON-vriendelijke markers. */
export async function encodeBlobs(value: unknown): Promise<unknown> {
  if (value instanceof Blob) return { __blob: await blobToBase64(value), type: value.type } satisfies BlobMarker;
  if (Array.isArray(value)) return Promise.all(value.map(encodeBlobs));
  if (typeof value === 'object' && value !== null) {
    const entries = await Promise.all(Object.entries(value).map(async ([k, v]) => [k, await encodeBlobs(v)] as const));
    return Object.fromEntries(entries);
  }
  return value;
}

/** Omgekeerde van `encodeBlobs`. */
export function decodeBlobs(value: unknown): unknown {
  if (isMarker(value)) return base64ToBlob(value.__blob, value.type);
  if (Array.isArray(value)) return value.map(decodeBlobs);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decodeBlobs(v)]));
  }
  return value;
}

export async function createBackup(storage: IndexedDbStorage): Promise<BackupFile> {
  const raw = await storage.dumpAll();
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profiles: (await encodeBlobs(raw.profiles)) as unknown[],
    progress: (await encodeBlobs(raw.progress)) as unknown[],
    records: (await encodeBlobs(raw.records)) as unknown[],
  };
}

/** Leest en controleert een back-up; gooit een Error met een leesbare melding bij een ongeldig bestand. */
export function parseBackup(text: string): BackupFile {
  let data: Partial<BackupFile>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Geen geldig back-upbestand');
  }
  if (data?.format !== BACKUP_FORMAT) throw new Error('Geen geldig back-upbestand');
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) throw new Error('Back-up is van een nieuwere versie van de app');
  if (![data.profiles, data.progress, data.records].every(Array.isArray)) throw new Error('Back-up is onvolledig');
  return data as BackupFile;
}

/** Vervangt alle gegevens door die uit de back-up. */
export async function restoreBackup(storage: IndexedDbStorage, backup: BackupFile): Promise<void> {
  await storage.replaceAll({
    profiles: decodeBlobs(backup.profiles) as unknown[],
    progress: decodeBlobs(backup.progress) as unknown[],
    records: decodeBlobs(backup.records) as unknown[],
  });
}
