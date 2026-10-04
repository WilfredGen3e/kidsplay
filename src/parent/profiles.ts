import type { Profile, ProfileStore } from '../platform/types';
import { avatarNode, confirmDialog, el, iconButton, textButton } from '../ui/dom';
import { AVATARS, COLORS, photoToAvatar } from './avatar';

export interface ProfilesDeps {
  profiles: ProfileStore;
  back(): void;
}

export async function showProfiles(root: HTMLElement, deps: ProfilesDeps): Promise<void> {
  const profiles = await deps.profiles.list();
  const screen = el('div', 'parent-screen');
  const header = el('header', 'parent-header');
  header.append(iconButton('⬅️', 'Terug', 'round-button', deps.back), el('h1', '', 'Profielen'));
  screen.append(header);

  const card = el('section', 'card');
  const head = el('div', 'card-head');
  head.append(el('h2', '', 'Kinderen'), textButton('➕ Nieuw profiel', 'btn btn-primary', () => showEditor(root, deps)));
  card.append(head);
  if (profiles.length === 0) card.append(el('p', 'muted', 'Nog geen profielen. Maak een profiel voor elk kind.'));
  for (const profile of profiles) {
    const row = el('div', 'puzzle-row');
    const badge = el('div', 'profile-badge');
    badge.style.background = profile.color;
    badge.append(avatarNode(profile.avatar, 'badge-avatar'));
    const info = el('div', 'row-info');
    info.append(
      el('strong', '', profile.name),
      el('span', 'muted', `Lade ${profile.drawerSide === 'left' ? 'links' : 'rechts'} · geluid ${profile.soundOn ? 'aan' : 'uit'}`),
    );
    row.append(
      badge,
      info,
      textButton('✏️ Wijzig', 'btn', () => showEditor(root, deps, profile)),
      textButton('🗑️', 'btn btn-danger', async () => {
        const ok = await confirmDialog(root, {
          icon: '🗑️',
          message: `Profiel van ${profile.name} verwijderen? Alle voortgang van ${profile.name} gaat verloren.`,
          confirmLabel: 'Verwijderen',
        });
        if (!ok) return;
        await deps.profiles.remove(profile.id);
        await showProfiles(root, deps);
      }),
    );
    card.append(row);
  }
  screen.append(card);
  root.replaceChildren(screen);
}

function showEditor(root: HTMLElement, deps: ProfilesDeps, existing?: Profile): void {
  const draft: Profile = existing
    ? { ...existing }
    : { id: `p-${Date.now().toString(36)}`, name: '', color: COLORS[0], avatar: AVATARS[0], drawerSide: 'right', soundOn: true };

  const screen = el('div', 'parent-screen');
  const header = el('header', 'parent-header');
  header.append(
    iconButton('⬅️', 'Terug', 'round-button', () => void showProfiles(root, deps)),
    el('h1', '', existing ? `Profiel van ${existing.name}` : 'Nieuw profiel'),
  );
  screen.append(header);
  const card = el('section', 'card');

  const preview = el('div', 'profile-preview');
  const renderPreview = () => {
    preview.style.background = draft.color;
    preview.replaceChildren(avatarNode(draft.avatar, 'preview-avatar'), el('span', 'preview-name', draft.name || 'Naam'));
  };

  const name = el('input', 'text-input');
  name.type = 'text';
  name.placeholder = 'Naam';
  name.value = draft.name;
  name.maxLength = 20;
  name.addEventListener('input', () => {
    draft.name = name.value;
    renderPreview();
  });
  const nameRow = el('label', 'row');
  nameRow.append(el('span', 'row-label', '🏷️ Naam'), name);

  const colors = el('div', 'chips');
  for (const color of COLORS) {
    const c = el('button', `color-swatch${color === draft.color ? ' active' : ''}`);
    c.type = 'button';
    c.style.background = color;
    c.setAttribute('aria-label', color);
    c.addEventListener('click', () => {
      draft.color = color;
      colors.querySelectorAll('.color-swatch').forEach((x) => x.classList.toggle('active', x === c));
      renderPreview();
    });
    colors.append(c);
  }

  const avatars = el('div', 'chips');
  const markAvatar = () =>
    avatars.querySelectorAll<HTMLElement>('.avatar-choice').forEach((x) => x.classList.toggle('active', x.dataset.avatar === draft.avatar));
  for (const avatar of AVATARS) {
    const a = textButton(avatar, 'avatar-choice', () => {
      draft.avatar = avatar;
      markAvatar();
      renderPreview();
    });
    a.dataset.avatar = avatar;
    avatars.append(a);
  }
  const photoInput = el('input');
  photoInput.type = 'file';
  photoInput.accept = 'image/*';
  photoInput.hidden = true;
  const message = el('p', 'error-text');
  photoInput.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    try {
      draft.avatar = await photoToAvatar(file);
      message.textContent = '';
      markAvatar();
      renderPreview();
    } catch {
      message.textContent = 'Deze foto kan niet worden gelezen.';
    }
  });
  avatars.append(textButton('📷 Eigen foto', 'btn', () => photoInput.click()), photoInput);

  const side = el('div', 'segmented');
  for (const [value, label] of [['left', '⬅️ Links'], ['right', 'Rechts ➡️']] as const) {
    const b = textButton(label, `seg${draft.drawerSide === value ? ' active' : ''}`, () => {
      draft.drawerSide = value;
      side.querySelectorAll('.seg').forEach((x) => x.classList.toggle('active', x === b));
    });
    side.append(b);
  }
  const sideRow = el('div', 'row');
  sideRow.append(el('span', 'row-label', '✋ Lade met stukjes'), side);

  const sound = el('input', 'switch');
  sound.type = 'checkbox';
  sound.checked = draft.soundOn;
  sound.addEventListener('change', () => (draft.soundOn = sound.checked));
  const soundRow = el('label', 'row');
  soundRow.append(el('span', 'row-label', '🔊 Geluid'), sound);

  const error = el('p', 'error-text');
  const save = textButton('💾 Opslaan', 'btn btn-primary btn-big', async () => {
    draft.name = draft.name.trim();
    if (!draft.name) return void (error.textContent = 'Geef het profiel een naam.');
    await deps.profiles.put(draft);
    await showProfiles(root, deps);
  });

  renderPreview();
  markAvatar();
  card.append(
    preview,
    nameRow,
    el('h3', '', '🎨 Kleur'),
    colors,
    el('h3', '', '🙂 Avatar'),
    avatars,
    message,
    sideRow,
    soundRow,
    error,
    save,
  );
  screen.append(card);
  root.replaceChildren(screen);
}
