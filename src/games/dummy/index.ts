import type { GameModule } from '../../platform/types';

interface DummyProgress {
  taps: number;
}

/** Testspel om de spel-interface te controleren; verdwijnt zodra de puzzel er is. */
export const dummyGame: GameModule = {
  id: 'dummy',
  name: 'Testspel',
  icon: '🎈',
  start(root, ctx) {
    root.innerHTML = '';
    const button = document.createElement('button');
    button.textContent = '🎈';
    root.append(button);

    let taps = 0;
    void ctx.progress.load<DummyProgress>().then((p) => {
      taps = p?.taps ?? 0;
    });
    button.addEventListener('click', () => {
      taps += 1;
      void ctx.progress.save<DummyProgress>({ taps });
    });
    return () => root.replaceChildren();
  },
  summarize(progress) {
    const taps = (progress as DummyProgress | undefined)?.taps ?? 0;
    return { stars: Math.floor(taps / 10) };
  },
};
