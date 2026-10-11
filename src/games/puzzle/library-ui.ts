import type { ManageContext } from '../../platform/types';
import { el, parentHeader, textButton } from '../../ui/dom';
import {
  fetchEntry,
  fetchIndex,
  importAll,
  importEntry,
  importedIds,
  isValidCode,
  normalizeCode,
  entryPath,
  rawUrl,
  CODE_LENGTH,
  type LibraryEntry,
} from './library';

/** Een netwerkfout (geen verbinding) klinkt anders dan een fout van GitHub. */
function describeError(error: unknown): string {
  return error instanceof TypeError ? 'Geen internetverbinding. Probeer het later nog eens.' : 'Dat lukte niet. Probeer het nog eens.';
}

function tile(entry: LibraryEntry, added: boolean, onAdd: () => void): HTMLElement {
  const node = el('button', `library-tile${added ? ' added' : ''}`);
  node.type = 'button';
  const img = el('img', 'library-thumb');
  img.src = rawUrl(entryPath(entry.code, 'thumb.jpg'));
  img.alt = '';
  img.loading = 'lazy';
  node.append(
    img,
    el('strong', '', entry.name),
    el('span', 'muted', `${entry.pieceOptions.join(', ')} stukjes`),
    el('span', 'library-badge', added ? '✅ Toegevoegd' : '➕ Toevoegen'),
  );
  if (added) node.disabled = true;
  else node.addEventListener('click', onAdd);
  return node;
}

/** Alle gedeelde foto's; kies er een of voeg alles in één keer toe. */
export function showLibrary(root: HTMLElement, ctx: ManageContext, back: () => void): void {
  const screen = el('div', 'parent-screen');
  screen.append(parentHeader('Bibliotheek', back));
  const card = el('section', 'card');
  const status = el('p', 'muted', 'Bibliotheek laden…');
  card.append(status);
  screen.append(card);
  root.replaceChildren(screen);

  void (async () => {
    let entries: LibraryEntry[];
    let have: Set<string>;
    try {
      [entries, have] = await Promise.all([fetchIndex(), importedIds(ctx.data)]);
    } catch (error) {
      status.textContent = describeError(error);
      card.append(textButton('🔄 Opnieuw', 'btn', () => showLibrary(root, ctx, back)));
      return;
    }
    if (entries.length === 0) {
      status.textContent = 'De bibliotheek is nog leeg. Foto’s zet je erin via de beheerconsole.';
      return;
    }

    const grid = el('div', 'library-grid');
    const allButton = textButton('', 'btn btn-primary', () => void addAll());
    const render = () => {
      const missing = entries.filter((e) => !have.has(e.id));
      status.textContent = `${entries.length} ${entries.length === 1 ? 'foto' : 'foto’s'} in de bibliotheek, ${missing.length} nog niet op dit apparaat.`;
      allButton.textContent = `➕ Alles toevoegen (${missing.length})`;
      allButton.hidden = missing.length === 0;
      grid.replaceChildren(
        ...entries.map((entry) =>
          tile(entry, have.has(entry.id), async () => {
            try {
              await importEntry(ctx.data, entry);
              have.add(entry.id);
            } catch (error) {
              status.textContent = describeError(error);
              return;
            }
            render();
          }),
        ),
      );
    };

    async function addAll() {
      allButton.disabled = true;
      const missing = entries.filter((e) => !have.has(e.id));
      const summary = await importAll(ctx.data, missing, undefined, undefined, (done, total) => {
        status.textContent = `Bezig… ${done} van ${total}`;
      });
      have = await importedIds(ctx.data);
      allButton.disabled = false;
      render();
      if (summary.failed > 0) status.textContent = `${summary.added} toegevoegd, ${summary.failed} niet gelukt. Probeer het nog eens.`;
    }

    card.append(allButton, grid);
    render();
  })();
}

/** Eén puzzel ophalen met de 5-cijferige code. */
export function showCodeEntry(root: HTMLElement, ctx: ManageContext, back: () => void): void {
  const screen = el('div', 'parent-screen');
  screen.append(parentHeader('Code invoeren', back));
  const card = el('section', 'card');
  const input = el('input', 'code-input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.maxLength = CODE_LENGTH + 2;
  input.placeholder = '•••••';
  input.autocomplete = 'off';
  const result = el('div', 'code-result');
  card.append(el('p', 'muted', 'Typ de code van 5 cijfers die je in de beheerconsole hebt gekregen.'), input, result);
  screen.append(card);
  root.replaceChildren(screen);

  let token = 0;
  input.addEventListener('input', () => {
    const code = normalizeCode(input.value);
    const mine = ++token;
    result.replaceChildren();
    if (!isValidCode(code)) return;
    result.append(el('p', 'muted', 'Zoeken…'));
    void (async () => {
      let entry: LibraryEntry | undefined;
      let added = false;
      try {
        entry = await fetchEntry(code);
        if (entry) added = (await importedIds(ctx.data)).has(entry.id);
      } catch (error) {
        if (mine === token) result.replaceChildren(el('p', 'error-text', describeError(error)));
        return;
      }
      if (mine !== token) return;
      if (!entry) return void result.replaceChildren(el('p', 'error-text', `Code ${code} is niet gevonden.`));
      const found = entry;
      result.replaceChildren(
        tile(found, added, async () => {
          try {
            await importEntry(ctx.data, found);
          } catch (error) {
            return void result.append(el('p', 'error-text', describeError(error)));
          }
          result.replaceChildren(tile(found, true, () => {}), el('p', 'muted', 'Klaar! De puzzel staat in de lijst.'));
        }),
      );
    })();
  });
  input.focus();
}
