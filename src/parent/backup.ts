import { el, iconButton, textButton, confirmDialog } from '../ui/dom';

export interface BackupActions {
  /** Alles als JSON-tekst. */
  create(): Promise<string>;
  /** Vervangt alles door de inhoud van een back-up; gooit een Error met een leesbare melding bij een ongeldig bestand. */
  restore(text: string): Promise<void>;
}

export function backupFileName(date = new Date()): string {
  return `familiespellen-${date.toISOString().slice(0, 10)}.json`;
}

function download(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = el('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function showBackup(root: HTMLElement, deps: BackupActions & { back(): void }): void {
  const screen = el('div', 'parent-screen');
  const header = el('header', 'parent-header');
  header.append(iconButton('⬅️', 'Terug', 'round-button', deps.back), el('h1', '', 'Back-up'));
  screen.append(header);

  const status = el('p', 'muted');
  const run = async (work: () => Promise<string>) => {
    try {
      status.textContent = await work();
    } catch (e) {
      status.textContent = e instanceof Error ? e.message : 'Er ging iets mis';
    }
  };

  const save = el('section', 'card');
  save.append(
    el('h2', '', 'Back-up maken'),
    el('p', '', 'Bewaar profielen, voortgang, puzzels, foto’s en stickers in één bestand.'),
    textButton('💾 Bestand downloaden', 'btn btn-primary btn-big', () =>
      void run(async () => {
        download(await deps.create(), backupFileName());
        return 'Back-up gedownload.';
      }),
    ),
  );

  const input = el('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.hidden = true;
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    void run(async () => {
      const text = await file.text();
      const ok = await confirmDialog(screen, {
        icon: '⚠️',
        message: 'Alles in deze app wordt vervangen door de back-up. Doorgaan?',
        confirmLabel: 'Vervangen',
      });
      if (!ok) return '';
      await deps.restore(text);
      location.reload();
      return 'Teruggezet.';
    });
  });

  const load = el('section', 'card');
  load.append(
    el('h2', '', 'Back-up terugzetten'),
    el('p', '', 'Kies een eerder gedownload bestand. Wat nu in de app staat, wordt vervangen.'),
    textButton('📂 Bestand kiezen', 'btn btn-big', () => input.click()),
    input,
  );

  screen.append(save, load, status);
  root.replaceChildren(screen);
}
