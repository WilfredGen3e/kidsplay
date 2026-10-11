import { describe, expect, it } from 'vitest';
import {
  fetchEntry,
  fetchIndex,
  generateCode,
  importAll,
  importEntry,
  isValidCode,
  newEntryId,
  normalizeCode,
  rawUrl,
  type LibraryEntry,
} from './library';
import type { GameData } from '../../platform/types';

const entry = (code: string, createdAt = '2026-01-01T00:00:00.000Z'): LibraryEntry => ({
  id: newEntryId(code, Date.parse(createdAt)),
  code,
  name: `Foto ${code}`,
  pieceOptions: [4, 8],
  createdAt,
});

function memoryData(): GameData & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    list: async <T>() => [...store.values()] as T[],
    get: async <T>(_c: string, id: string) => store.get(id) as T | undefined,
    put: async (_c: string, id: string, value: unknown) => void store.set(id, value),
    remove: async (_c: string, id: string) => void store.delete(id),
  };
}

/** Nep-fetch: pad (zonder host en query) → antwoord. Onbekende paden geven 404. */
function fakeFetch(files: Record<string, unknown>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const path = url.pathname.split('/').slice(4).join('/');
    if (!(path in files)) return new Response('', { status: 404 });
    const body = files[path];
    return new Response(typeof body === 'string' ? body : JSON.stringify(body));
  }) as typeof fetch;
}

describe('codes', () => {
  it('herkent geldige codes van precies 5 cijfers', () => {
    expect(isValidCode('48213')).toBe(true);
    expect(isValidCode('00042')).toBe(true);
    expect(isValidCode('4821')).toBe(false);
    expect(isValidCode('482130')).toBe(false);
    expect(isValidCode('48a13')).toBe(false);
  });
  it('haalt spaties en streepjes uit de invoer', () => {
    expect(normalizeCode('48 213')).toBe('48213');
    expect(normalizeCode('48-213')).toBe('48213');
  });
  it('maakt altijd 5 cijfers, ook met voorloopnullen', () => {
    expect(generateCode([], () => 0)).toBe('00000');
    expect(generateCode([], () => 0.00042)).toBe('00042');
    expect(generateCode([], () => 0.999999)).toBe('99999');
  });
  it('slaat gebruikte codes over', () => {
    const values = [0.1, 0.1, 0.2];
    let i = 0;
    expect(generateCode(['10000'], () => values[i++])).toBe('20000');
  });
});

describe('rawUrl', () => {
  it('wijst naar de fotos-branch', () => {
    expect(rawUrl('index.json')).toBe('https://raw.githubusercontent.com/WilfredGen3e/kidsplay/fotos/index.json');
  });
});

describe('fetchIndex', () => {
  it('geeft de lijst, nieuwste eerst, en negeert kapotte regels', async () => {
    const files = {
      'index.json': {
        version: 1,
        entries: [entry('11111', '2026-01-01T00:00:00.000Z'), { code: 'kapot' }, entry('22222', '2026-02-01T00:00:00.000Z')],
      },
    };
    const list = await fetchIndex(fakeFetch(files));
    expect(list.map((e) => e.code)).toEqual(['22222', '11111']);
  });
  it('geeft een lege bibliotheek als de lijst nog niet bestaat', async () => {
    expect(await fetchIndex(fakeFetch({}))).toEqual([]);
  });
  it('geeft een fout bij een serverfout', async () => {
    const failing = (async () => new Response('', { status: 500 })) as typeof fetch;
    await expect(fetchIndex(failing)).rejects.toThrow();
  });
});

describe('fetchEntry', () => {
  it('vindt een foto op code', async () => {
    const e = entry('48213');
    expect(await fetchEntry('48213', fakeFetch({ 'codes/48213/puzzle.json': e }))).toEqual(e);
  });
  it('geeft undefined bij onbekende of ongeldige code', async () => {
    expect(await fetchEntry('48213', fakeFetch({}))).toBeUndefined();
    expect(await fetchEntry('12', fakeFetch({}))).toBeUndefined();
  });
});

describe('importEntry', () => {
  const files = (code: string) => ({
    [`codes/${code}/foto.jpg`]: 'JPEGDATA',
    [`codes/${code}/thumb.jpg`]: 'THUMB',
  });

  it('maakt een gewone puzzel, zichtbaar voor iedereen', async () => {
    const data = memoryData();
    const e = entry('48213');
    expect(await importEntry(data, e, fakeFetch(files('48213')))).toBe('toegevoegd');
    const puzzle = data.store.get(e.id) as { name: string; visibleFor: unknown; pieceOptions: number[]; image: Blob };
    expect(puzzle.name).toBe('Foto 48213');
    expect(puzzle.visibleFor).toBe('all');
    expect(puzzle.pieceOptions).toEqual([4, 8]);
    expect(await puzzle.image.text()).toBe('JPEGDATA');
  });
  it('voegt dezelfde foto niet twee keer toe', async () => {
    const data = memoryData();
    const e = entry('48213');
    await importEntry(data, e, fakeFetch(files('48213')));
    expect(await importEntry(data, e, fakeFetch({}))).toBe('bestond al');
    expect(data.store.size).toBe(1);
  });
  it('schrijft niets als de foto ontbreekt', async () => {
    const data = memoryData();
    await expect(importEntry(data, entry('48213'), fakeFetch({}))).rejects.toThrow();
    expect(data.store.size).toBe(0);
  });
});

describe('importAll', () => {
  it('voegt toe wat ontbreekt, telt overgeslagen en mislukte', async () => {
    const data = memoryData();
    const a = entry('11111');
    const b = entry('22222', '2026-02-01T00:00:00.000Z');
    const c = entry('33333', '2026-03-01T00:00:00.000Z');
    const fetcher = fakeFetch({
      'codes/11111/foto.jpg': 'A',
      'codes/11111/thumb.jpg': 'a',
      'codes/22222/foto.jpg': 'B',
      'codes/22222/thumb.jpg': 'b',
      // 33333 ontbreekt
    });
    await importEntry(data, a, fetcher);
    const progress: number[] = [];
    const summary = await importAll(data, [a, b, c], fetcher, undefined, (done) => progress.push(done));
    expect(summary).toEqual({ added: 1, skipped: 1, failed: 1 });
    expect(progress).toEqual([1, 2, 3]);
    expect(data.store.size).toBe(2);
  });
});
