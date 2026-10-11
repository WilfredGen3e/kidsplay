import { describe, expect, it } from 'vitest';
import { checkForUpdate, type RegistrationLike, type WorkerLike } from './update';

function worker(state: string): WorkerLike & { set(state: string): void } {
  let listener: (() => void) | undefined;
  const w = {
    state,
    addEventListener: (_: 'statechange', l: () => void) => void (listener = l),
    set(next: string) {
      w.state = next;
      listener?.();
    },
  };
  return w;
}

const registration = (over: Partial<RegistrationLike> = {}): RegistrationLike => ({
  update: async () => undefined,
  addEventListener: () => undefined,
  installing: null,
  waiting: null,
  ...over,
});

describe('checkForUpdate', () => {
  it('meldt actueel als er geen nieuwe worker is', async () => {
    expect(await checkForUpdate(registration())).toBe('actueel');
  });
  it('meldt offline als de controle mislukt', async () => {
    const reg = registration({ update: async () => Promise.reject(new TypeError('Failed to fetch')) });
    expect(await checkForUpdate(reg)).toBe('offline');
  });
  it('wacht tot de nieuwe versie actief is en meldt dan nieuw', async () => {
    const w = worker('installing');
    const result = checkForUpdate(registration({ installing: w }));
    w.set('installed');
    w.set('activating');
    w.set('activated');
    expect(await result).toBe('nieuw');
  });
  it('meldt nieuw als de versie al actief is voordat update() klaar is', async () => {
    const w = worker('activated');
    let onFound: () => void = () => undefined;
    const reg = registration({
      installing: w,
      addEventListener: (_: 'updatefound', l: () => void) => void (onFound = l),
      update: async () => {
        onFound(); // updatefound, daarna is `installing` weer leeg
        reg.installing = null;
      },
    });
    expect(await checkForUpdate(reg)).toBe('nieuw');
  });
  it('meldt nieuw als de worker al actief is', async () => {
    expect(await checkForUpdate(registration({ waiting: worker('activated') }))).toBe('nieuw');
  });
  it('meldt actueel als de installatie mislukt', async () => {
    const w = worker('installing');
    const result = checkForUpdate(registration({ installing: w }));
    w.set('redundant');
    expect(await result).toBe('actueel');
  });
  it('geeft op na de time-out', async () => {
    expect(await checkForUpdate(registration({ installing: worker('installing') }), 10)).toBe('actueel');
  });
});
