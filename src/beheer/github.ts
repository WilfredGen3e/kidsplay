import { INDEX_PATH, LIBRARY_REPO, type Fetcher, type LibraryEntry, type LibraryRepo } from '../games/puzzle/library';
import type { RepoFile, RepoWriter } from '../games/puzzle/library-admin';

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type TokenCheck = 'ok' | 'ongeldig' | 'geen-schrijfrechten';

const API = 'https://api.github.com';

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * Schrijft naar de `fotos`-branch met de Git Data API: bestanden in één commit, en de branch
 * wordt als losse (lege) geschiedenis aangemaakt als hij nog niet bestaat.
 */
export function createGitHub(token: string, repo: LibraryRepo = LIBRARY_REPO, fetcher: Fetcher = fetch.bind(globalThis)): RepoWriter & {
  check(): Promise<TokenCheck>;
} {
  const root = `/repos/${repo.owner}/${repo.repo}`;

  async function call(path: string, init: RequestInit = {}, extra: Record<string, string> = {}): Promise<Response> {
    return fetcher(`${API}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...extra,
      },
    });
  }

  async function json<T>(response: Response, what: string): Promise<T> {
    if (!response.ok) throw new GitHubError(`${what} mislukt (${response.status})`, response.status);
    return (await response.json()) as T;
  }

  const post = (path: string, body: unknown) => call(path, { method: 'POST', body: JSON.stringify(body) });

  return {
    async check() {
      const response = await call(root);
      if (response.status === 401 || response.status === 404) return 'ongeldig';
      const data = await json<{ permissions?: { push?: boolean } }>(response, 'Token controleren');
      return data.permissions?.push ? 'ok' : 'geen-schrijfrechten';
    },

    async readIndex() {
      const response = await call(
        `${root}/contents/${INDEX_PATH}?ref=${repo.branch}`,
        {},
        { Accept: 'application/vnd.github.raw+json' },
      );
      if (response.status === 404) return [];
      if (!response.ok) throw new GitHubError(`Lijst ophalen mislukt (${response.status})`, response.status);
      const index = JSON.parse(await response.text()) as { entries?: LibraryEntry[] };
      return index.entries ?? [];
    },

    async commit(files: RepoFile[], message: string) {
      const refPath = `${root}/git/ref/heads/${repo.branch}`;
      const refResponse = await call(refPath);
      let parent: { commit: string; tree: string } | undefined;
      if (refResponse.ok) {
        const ref = await json<{ object: { sha: string } }>(refResponse, 'Branch lezen');
        const commit = await json<{ tree: { sha: string } }>(
          await call(`${root}/git/commits/${ref.object.sha}`),
          'Commit lezen',
        );
        parent = { commit: ref.object.sha, tree: commit.tree.sha };
      } else if (refResponse.status !== 404) {
        throw new GitHubError(`Branch lezen mislukt (${refResponse.status})`, refResponse.status);
      }

      const tree = [];
      for (const file of files) {
        if (file.content === null) {
          tree.push({ path: file.path, mode: '100644', type: 'blob', sha: null });
          continue;
        }
        const blob = await json<{ sha: string }>(
          await post(
            `${root}/git/blobs`,
            typeof file.content === 'string'
              ? { content: file.content, encoding: 'utf-8' }
              : { content: await toBase64(file.content), encoding: 'base64' },
          ),
          'Foto uploaden',
        );
        tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
      }

      const newTree = await json<{ sha: string }>(
        await post(`${root}/git/trees`, { tree, ...(parent ? { base_tree: parent.tree } : {}) }),
        'Map opbouwen',
      );
      const commit = await json<{ sha: string }>(
        await post(`${root}/git/commits`, {
          message,
          tree: newTree.sha,
          parents: parent ? [parent.commit] : [],
        }),
        'Commit maken',
      );
      if (parent) {
        await json(
          await call(`${root}/git/refs/heads/${repo.branch}`, {
            method: 'PATCH',
            body: JSON.stringify({ sha: commit.sha }),
          }),
          'Branch bijwerken',
        );
      } else {
        await json(await post(`${root}/git/refs`, { ref: `refs/heads/${repo.branch}`, sha: commit.sha }), 'Branch aanmaken');
      }
    },
  };
}
