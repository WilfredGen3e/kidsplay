import '../style.css';
import { confirmDialog, el, parentHeader, textButton } from '../ui/dom';
import { createCropper } from '../games/puzzle/cropper';
import { allowedPieceCounts } from '../games/puzzle/grid';
import { canvasToBlob, thumbnail } from '../games/puzzle/image';
import { DEFAULT_PIECE_OPTIONS } from '../games/puzzle/model';
import { LIBRARY_REPO, entryPath, rawUrl, type LibraryEntry } from '../games/puzzle/library';
import { deletePhoto, publishPhoto, updatePhoto } from '../games/puzzle/library-admin';
import { isAccessCode, isUnlocked, markUnlocked } from './access';
import { GitHubError, createGitHub } from './github';

const TOKEN_KEY = 'kidsplay-beheer-token';
const app = document.querySelector<HTMLDivElement>('#app')!;

function storedToken(): string | undefined {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function saveToken(token: string | undefined) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Zonder localStorage moet het token bij elk bezoek opnieuw worden ingevoerd.
  }
}

function errorText(error: unknown): string {
  if (error instanceof GitHubError) {
    if (error.status === 401 || error.status === 403) return 'GitHub weigert het token. Is het verlopen of heeft het geen schrijfrechten?';
    return error.message;
  }
  return error instanceof TypeError ? 'Geen internetverbinding.' : 'Er ging iets mis. Probeer het nog eens.';
}

// --- inloggen met token
function showLogin(message = '') {
  const screen = el('div', 'parent-screen');
  const head = el('header', 'parent-header');
  head.append(el('h1', '', '🔐 Beheerconsole'));
  const card = el('section', 'card');
  const input = el('input', 'text-input');
  input.type = 'password';
  input.placeholder = 'GitHub-token (github_pat_…)';
  input.autocomplete = 'off';
  const error = el('p', 'error-text', message);
  const go = textButton('Inloggen', 'btn btn-primary btn-big', async () => {
    error.textContent = '';
    const token = input.value.trim();
    if (!token) return void (error.textContent = 'Plak eerst je token.');
    go.disabled = true;
    try {
      const result = await createGitHub(token).check();
      if (result === 'ok') {
        saveToken(token);
        return void showConsole(token);
      }
      error.textContent =
        result === 'ongeldig'
          ? 'Dit token werkt niet voor deze repository.'
          : 'Dit token mag niets schrijven. Geef het “Contents: Read and write”.';
    } catch (e) {
      error.textContent = errorText(e);
    }
    go.disabled = false;
  });
  const how = el('ol', 'console-note');
  for (const step of [
    'GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.',
    `Repository access: alleen ${LIBRARY_REPO.owner}/${LIBRARY_REPO.repo}.`,
    'Permissions → Repository → Contents: Read and write.',
    'Kopieer het token en plak het hierboven. Het blijft alleen in de browser van dit apparaat.',
  ]) {
    how.append(el('li', '', step));
  }
  card.append(
    el('p', '', 'Alleen met jouw persoonlijke token kun je foto’s toevoegen of verwijderen.'),
    input,
    error,
    go,
    el('h3', '', 'Token maken'),
    how,
  );
  screen.append(head, card);
  app.replaceChildren(screen);
}

// --- console
function showConsole(token: string) {
  const github = createGitHub(token);
  const screen = el('div', 'parent-screen');
  const head = parentHeader('Beheerconsole', () => (location.href = './'));
  head.append(
    textButton('Uitloggen', 'btn', () => {
      saveToken(undefined);
      showLogin();
    }),
  );
  screen.append(head);

  // Nieuwe foto delen
  const upload = el('section', 'card');
  upload.append(el('h2', '', '📤 Nieuwe foto delen'));
  const name = el('input', 'text-input');
  name.type = 'text';
  name.placeholder = 'Naam van de puzzel';
  const cropper = createCropper((fileName) => {
    if (!name.value) name.value = fileName;
  });
  const nameRow = el('label', 'row');
  nameRow.append(el('span', 'row-label', '🏷️ Naam'), name);
  const counts = new Set(DEFAULT_PIECE_OPTIONS);
  const countsBox = pieceChips(counts);
  const status = el('p', 'error-text');
  const publish = textButton('📤 Delen', 'btn btn-primary btn-big', async () => {
    status.className = 'error-text';
    status.textContent = '';
    if (!cropper.hasImage()) return void (status.textContent = 'Kies eerst een foto.');
    if (!name.value.trim()) return void (status.textContent = 'Geef de puzzel een naam.');
    if (counts.size === 0) return void (status.textContent = 'Kies minstens één aantal stukjes.');
    publish.disabled = true;
    status.className = 'muted';
    status.textContent = 'Uploaden…';
    try {
      const cropped = cropper.result();
      const entry = await publishPhoto(github, {
        name: name.value,
        pieceOptions: [...counts],
        image: await canvasToBlob(cropped),
        thumb: await canvasToBlob(thumbnail(cropped)),
      });
      showShared(entry);
    } catch (e) {
      status.className = 'error-text';
      status.textContent = errorText(e);
      publish.disabled = false;
    }
  });
  upload.append(cropper.element, nameRow, el('h3', '', '🧩 Aantal stukjes om uit te kiezen'), countsBox, status, publish);

  // Bibliotheek
  const library = el('section', 'card');
  library.append(el('h2', '', '📚 Bibliotheek'));
  const list = el('div');
  const listStatus = el('p', 'muted', 'Laden…');
  library.append(listStatus, list);

  async function refresh() {
    try {
      const entries = (await github.readIndex()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      listStatus.textContent = entries.length === 0 ? 'Nog geen foto’s gedeeld.' : `${entries.length} foto’s.`;
      list.replaceChildren(...entries.map(row));
    } catch (e) {
      listStatus.textContent = errorText(e);
    }
  }

  function row(entry: LibraryEntry): HTMLElement {
    const node = el('div', 'puzzle-row');
    const img = el('img', 'row-thumb');
    img.src = rawUrl(entryPath(entry.code, 'thumb.jpg'));
    img.alt = '';
    const info = el('div', 'row-info');
    info.append(
      el('strong', '', entry.name),
      el('span', 'code-badge', entry.code),
      el('span', 'muted', `${entry.pieceOptions.join(', ')} stukjes`),
    );
    node.append(
      img,
      info,
      textButton('✏️ Wijzig', 'btn', () => node.replaceChildren(editRow(entry))),
      textButton('🗑️', 'btn btn-danger', async () => {
        const ok = await confirmDialog(app, {
          icon: '🗑️',
          message: `“${entry.name}” (code ${entry.code}) uit de bibliotheek halen? Apparaten die de foto al hebben, houden hem. In de GitHub-geschiedenis blijft hij staan.`,
          confirmLabel: 'Verwijderen',
        });
        if (!ok) return;
        try {
          await deletePhoto(github, entry.code);
        } catch (e) {
          listStatus.textContent = errorText(e);
          return;
        }
        await refresh();
      }),
    );
    return node;
  }

  function editRow(entry: LibraryEntry): HTMLElement {
    const box = el('div', 'edit-row');
    const input = el('input', 'text-input');
    input.type = 'text';
    input.value = entry.name;
    const set = new Set(entry.pieceOptions);
    const error = el('p', 'error-text');
    box.append(
      input,
      pieceChips(set),
      error,
      textButton('💾 Opslaan', 'btn btn-primary', async () => {
        if (!input.value.trim() || set.size === 0) return void (error.textContent = 'Geef een naam en minstens één aantal.');
        try {
          await updatePhoto(github, entry.code, { name: input.value, pieceOptions: [...set] });
        } catch (e) {
          return void (error.textContent = errorText(e));
        }
        await refresh();
      }),
      textButton('Annuleren', 'btn', () => void refresh()),
    );
    return box;
  }

  function showShared(entry: LibraryEntry) {
    const done = el('div', 'parent-screen');
    const card = el('section', 'card');
    card.append(
      el('h2', '', `✅ “${entry.name}” is gedeeld`),
      el('p', '', 'Voer deze code in op een ander apparaat (ouder → Puzzels → 🔢 Code invoeren):'),
      el('div', 'code-big', entry.code),
      el('p', 'muted', 'De foto staat ook voortaan in 📚 Bibliotheek, voor nieuwe apparaten.'),
      textButton('➕ Nog een foto', 'btn btn-primary btn-big', () => showConsole(token)),
    );
    done.append(card);
    app.replaceChildren(done);
  }

  screen.append(upload, library);
  app.replaceChildren(screen);
  void refresh();
}

function pieceChips(set: Set<number>): HTMLElement {
  const box = el('div', 'chips');
  for (const n of allowedPieceCounts()) {
    const chip = textButton(String(n), `chip${set.has(n) ? ' active' : ''}`, () => {
      if (set.has(n)) set.delete(n);
      else set.add(n);
      chip.classList.toggle('active', set.has(n));
    });
    box.append(chip);
  }
  return box;
}

// --- slot: toegangscode vóór alles
function showLock() {
  const screen = el('div', 'parent-screen');
  const head = el('header', 'parent-header');
  head.append(el('h1', '', '🔒 Beheerconsole'));
  const card = el('section', 'card');
  const input = el('input', 'code-input');
  input.type = 'password';
  input.inputMode = 'numeric';
  input.maxLength = 8;
  input.placeholder = '••••';
  input.autocomplete = 'off';
  const error = el('p', 'error-text');
  input.addEventListener('input', () => {
    error.textContent = '';
    if (isAccessCode(input.value)) {
      markUnlocked();
      return void start();
    }
    if (input.value.replace(/\D/g, '').length >= 4) {
      error.textContent = 'Die code klopt niet.';
      input.value = '';
    }
  });
  card.append(el('p', 'muted', 'Typ de toegangscode.'), input, error);
  screen.append(head, card);
  app.replaceChildren(screen);
  input.focus();
}

function start() {
  const token = storedToken();
  if (token) showConsole(token);
  else showLogin();
}

if (isUnlocked()) start();
else showLock();
