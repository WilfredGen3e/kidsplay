import { describe, expect, it } from 'vitest';
import { createGitHub } from './github';

interface Call {
  method: string;
  path: string;
  body?: any;
  auth?: string;
}

/** Nep-GitHub: houdt één branch bij en beantwoordt precies de aanroepen die de client doet. */
function fakeApi(opts: { branchExists: boolean; push?: boolean; indexText?: string }) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit = {}) => {
    const path = url.replace('https://api.github.com', '');
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    const headers = init.headers as Record<string, string>;
    calls.push({ method: init.method ?? 'GET', path, body, auth: headers.Authorization });
    const ok = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
    if (path === '/repos/o/r') return ok({ permissions: { push: opts.push ?? true } });
    if (path.startsWith('/repos/o/r/contents/index.json')) {
      return opts.indexText ? new Response(opts.indexText) : new Response('', { status: 404 });
    }
    if (path === '/repos/o/r/git/ref/heads/fotos') return opts.branchExists ? ok({ object: { sha: 'parent' } }) : ok({}, 404);
    if (path === '/repos/o/r/git/commits/parent') return ok({ tree: { sha: 'parenttree' } });
    if (path === '/repos/o/r/git/blobs') return ok({ sha: `blob${calls.length}` });
    if (path === '/repos/o/r/git/trees') return ok({ sha: 'newtree' });
    if (path === '/repos/o/r/git/commits') return ok({ sha: 'newcommit' });
    if (path === '/repos/o/r/git/refs' || path === '/repos/o/r/git/refs/heads/fotos') return ok({});
    return ok({}, 500);
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

const repo = { owner: 'o', repo: 'r', branch: 'fotos' };

describe('createGitHub', () => {
  it('controleert het token op schrijfrechten', async () => {
    expect(await createGitHub('t', repo, fakeApi({ branchExists: true }).fetcher).check()).toBe('ok');
    expect(await createGitHub('t', repo, fakeApi({ branchExists: true, push: false }).fetcher).check()).toBe('geen-schrijfrechten');
  });

  it('maakt de branch aan zonder parent als hij nog niet bestaat', async () => {
    const { calls, fetcher } = fakeApi({ branchExists: false });
    await createGitHub('geheim', repo, fetcher).commit(
      [
        { path: 'index.json', content: '{}' },
        { path: 'codes/1/foto.jpg', content: new Blob(['abc']) },
      ],
      'test',
    );
    const commit = calls.find((c) => c.path === '/repos/o/r/git/commits')!;
    expect(commit.body.parents).toEqual([]);
    expect(calls.find((c) => c.path === '/repos/o/r/git/trees')!.body.base_tree).toBeUndefined();
    const create = calls.find((c) => c.path === '/repos/o/r/git/refs')!;
    expect(create.method).toBe('POST');
    expect(create.body).toEqual({ ref: 'refs/heads/fotos', sha: 'newcommit' });
    const blobs = calls.filter((c) => c.path === '/repos/o/r/git/blobs').map((c) => c.body);
    expect(blobs).toEqual([
      { content: '{}', encoding: 'utf-8' },
      { content: btoa('abc'), encoding: 'base64' },
    ]);
    expect(calls.every((c) => c.auth === 'Bearer geheim')).toBe(true);
  });

  it('bouwt voort op de bestaande branch en verwijdert met sha null', async () => {
    const { calls, fetcher } = fakeApi({ branchExists: true });
    await createGitHub('t', repo, fetcher).commit([{ path: 'codes/1/foto.jpg', content: null }], 'weg');
    const trees = calls.find((c) => c.path === '/repos/o/r/git/trees')!;
    expect(trees.body.base_tree).toBe('parenttree');
    expect(trees.body.tree).toEqual([{ path: 'codes/1/foto.jpg', mode: '100644', type: 'blob', sha: null }]);
    expect(calls.find((c) => c.path === '/repos/o/r/git/commits')!.body.parents).toEqual(['parent']);
    expect(calls.find((c) => c.path === '/repos/o/r/git/refs/heads/fotos')!.method).toBe('PATCH');
  });

  it('leest de lijst, en geeft leeg als die nog niet bestaat', async () => {
    const text = JSON.stringify({ version: 1, entries: [{ code: '12345' }] });
    expect(await createGitHub('t', repo, fakeApi({ branchExists: true, indexText: text }).fetcher).readIndex()).toHaveLength(1);
    expect(await createGitHub('t', repo, fakeApi({ branchExists: false }).fetcher).readIndex()).toEqual([]);
  });
});
