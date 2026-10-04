import { createGameData } from '../platform/context';
import type { GameModule, ProfileStore, ProgressStore, RecordStore } from '../platform/types';
import { avatarNode, el, iconButton } from '../ui/dom';

export interface OverviewDeps {
  profiles: ProfileStore;
  progress: ProgressStore;
  records: RecordStore;
  games: GameModule[];
  back(): void;
}

export async function showOverview(root: HTMLElement, deps: OverviewDeps): Promise<void> {
  const screen = el('div', 'parent-screen');
  const header = el('header', 'parent-header');
  header.append(iconButton('⬅️', 'Terug', 'round-button', deps.back), el('h1', '', 'Voortgang'));
  screen.append(header);

  const profiles = await deps.profiles.list();
  if (profiles.length === 0) screen.append(el('p', 'muted', 'Nog geen profielen.'));
  for (const profile of profiles) {
    const card = el('section', 'card');
    const head = el('div', 'card-head');
    const badge = el('div', 'profile-badge');
    badge.style.background = profile.color;
    badge.append(avatarNode(profile.avatar, 'badge-avatar'));
    head.append(badge, el('h2', '', profile.name));
    card.append(head);

    let any = false;
    for (const game of deps.games) {
      if (!game.overview) continue;
      const saved = await deps.progress.load(profile.id, game.id);
      const rows = await game.overview(saved, createGameData(deps.records, game.id));
      for (const row of rows) {
        any = true;
        const r = el('div', 'puzzle-row');
        if (row.image) {
          const img = el('img', 'row-thumb');
          img.src = row.image;
          img.alt = '';
          r.append(img);
        } else {
          r.append(el('div', 'row-thumb', game.icon));
        }
        const info = el('div', 'row-info');
        info.append(el('strong', '', `${game.icon} ${row.title}`), el('span', 'muted', row.details.join(' · ')));
        r.append(info, el('span', 'status', row.done ? '⭐' : '▶️'));
        card.append(r);
      }
    }
    if (!any) card.append(el('p', 'muted', `${profile.name} heeft nog niets gespeeld.`));
    screen.append(card);
  }
  root.replaceChildren(screen);
}
