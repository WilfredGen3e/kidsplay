import { describe, expect, it } from 'vitest';
import { deletePhoto, publishPhoto, updatePhoto, type RepoFile, type RepoWriter } from './library-admin';
import type { LibraryEntry } from './library';

/** Nep-branch: bestanden in een Map, één commit tegelijk. */
function fakeRepo() {
  const files = new Map<string, Blob | string>();
  const commits: string[] = [];
  const repo: RepoWriter = {
    readIndex: async () => {
      const text = files.get('index.json');
      return text ? (JSON.parse(String(text)).entries as LibraryEntry[]) : [];
    },
    commit: async (changes: RepoFile[], message: string) => {
      for (const c of changes) {
        if (c.content === null) files.delete(c.path);
        else files.set(c.path, c.content);
      }
      commits.push(message);
    },
  };
  return { repo, files, commits };
}

const photo = { name: '  Strand  ', pieceOptions: [12, 4], image: new Blob(['i']), thumb: new Blob(['t']) };

describe('publishPhoto', () => {
  it('schrijft foto, thumb, puzzel.json en lijst in één commit', async () => {
    const { repo, files, commits } = fakeRepo();
    const entry = await publishPhoto(repo, photo, new Date('2026-05-01T10:00:00Z'));
    expect(commits).toHaveLength(1);
    expect(entry.code).toMatch(/^\d{5}$/);
    expect(entry.name).toBe('Strand');
    expect(entry.pieceOptions).toEqual([4, 12]);
    expect([...files.keys()].sort()).toEqual(
      [`codes/${entry.code}/foto.jpg`, `codes/${entry.code}/puzzle.json`, `codes/${entry.code}/thumb.jpg`, 'index.json'].sort(),
    );
    expect(JSON.parse(String(files.get(`codes/${entry.code}/puzzle.json`)))).toEqual(entry);
  });
  it('zet de nieuwste vooraan en kiest een nieuwe code', async () => {
    const { repo } = fakeRepo();
    const a = await publishPhoto(repo, photo);
    const b = await publishPhoto(repo, { ...photo, name: 'Bos' });
    expect(b.code).not.toBe(a.code);
    expect((await repo.readIndex()).map((e) => e.name)).toEqual(['Bos', 'Strand']);
  });
});

describe('updatePhoto', () => {
  it('past naam en aantallen aan, code en id blijven', async () => {
    const { repo } = fakeRepo();
    const a = await publishPhoto(repo, photo);
    const updated = await updatePhoto(repo, a.code, { name: 'Zee', pieceOptions: [24, 8] });
    expect(updated).toMatchObject({ id: a.id, code: a.code, name: 'Zee', pieceOptions: [8, 24] });
    expect((await repo.readIndex())[0].name).toBe('Zee');
  });
  it('geeft een fout bij een onbekende code', async () => {
    const { repo } = fakeRepo();
    await expect(updatePhoto(repo, '12345', { name: 'x', pieceOptions: [4] })).rejects.toThrow();
  });
});

describe('deletePhoto', () => {
  it('haalt alle bestanden en de regel in de lijst weg', async () => {
    const { repo, files } = fakeRepo();
    const a = await publishPhoto(repo, photo);
    const b = await publishPhoto(repo, { ...photo, name: 'Bos' });
    await deletePhoto(repo, a.code);
    expect([...files.keys()].some((k) => k.startsWith(`codes/${a.code}/`))).toBe(false);
    expect((await repo.readIndex()).map((e) => e.code)).toEqual([b.code]);
  });
  it('doet niets bij een onbekende code', async () => {
    const { repo, commits } = fakeRepo();
    await deletePhoto(repo, '99999');
    expect(commits).toHaveLength(0);
  });
});
