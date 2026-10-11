/** Uitkomst van "zoek een nieuwe versie". */
export type UpdateResult = 'nieuw' | 'actueel' | 'offline';

/** Wat de app nodig heeft om zichzelf te verversen; ontbreekt in tests en in de Tauri-app. */
export interface UpdateActions {
  /** Zoekt een nieuwe versie en wacht tot die klaarstaat. Bij 'nieuw' moet de pagina worden herladen. */
  check(): Promise<UpdateResult>;
  /** Er staat al een nieuwe versie klaar (bijvoorbeeld op de achtergrond opgehaald). */
  isReady(): boolean;
  /** Roept `callback` aan zodra er een nieuwe versie klaarstaat. */
  onReady(callback: () => void): void;
  reload(): void;
}

/** Het deel van `ServiceWorkerRegistration` dat we gebruiken; maakt testen zonder browser mogelijk. */
export interface WorkerLike {
  state: string;
  addEventListener(type: 'statechange', listener: () => void): void;
}
export interface RegistrationLike {
  update(): Promise<unknown>;
  addEventListener(type: 'updatefound', listener: () => void): void;
  installing: WorkerLike | null;
  waiting: WorkerLike | null;
}

/** Wacht tot de worker actief is (`activated`); false bij een time-out of een mislukte installatie. */
function untilActivated(worker: WorkerLike, timeoutMs: number): Promise<boolean> {
  if (worker.state === 'activated') return Promise.resolve(true);
  if (worker.state === 'redundant') return Promise.resolve(false);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') {
        clearTimeout(timer);
        resolve(true);
      } else if (worker.state === 'redundant') {
        clearTimeout(timer);
        resolve(false);
      }
    });
  });
}

/**
 * Vraagt de browser sw.js opnieuw op. Is er een andere versie, dan installeert en activeert die vanzelf
 * (de service worker roept `skipWaiting` aan); daarna is herladen genoeg.
 */
export async function checkForUpdate(reg: RegistrationLike, timeoutMs = 20000): Promise<UpdateResult> {
  // `update()` kan pas klaar zijn als de nieuwe versie al actief is; `installing` is dan weer leeg.
  // Het `updatefound`-signaal onthoudt daarom welke worker er gevonden is.
  let found: WorkerLike | null = null;
  reg.addEventListener('updatefound', () => void (found = reg.installing));
  try {
    await reg.update();
  } catch {
    return 'offline';
  }
  const worker = found ?? reg.installing ?? reg.waiting;
  if (!worker) return 'actueel';
  return (await untilActivated(worker, timeoutMs)) ? 'nieuw' : 'actueel';
}

/** Bruikbaar in de webapp/PWA (http(s), productiebuild); niet in dev of in de Tauri-app. */
export function canSelfUpdate(): boolean {
  return 'serviceWorker' in navigator && location.protocol.startsWith('http') && import.meta.env.PROD;
}

/**
 * Koppelt de service worker aan de app: controleert bij het openen en bij terugkeren uit de achtergrond
 * (een PWA op de iPad wordt zelden echt herstart) en meldt als er een nieuwe versie klaarstaat.
 */
export function createUpdateActions(): UpdateActions {
  const sw = navigator.serviceWorker;
  // Bij het allereerste bezoek is er nog geen controller; dat is geen update.
  const hadController = !!sw.controller;
  let ready = false;
  const listeners: Array<() => void> = [];
  const markReady = () => {
    ready = true;
    for (const l of listeners) l();
  };
  if (hadController) sw.addEventListener('controllerchange', markReady);

  const registration = () => sw.getRegistration();
  const quietCheck = async () => {
    const reg = await registration();
    if (reg) await checkForUpdate(reg).catch(() => undefined);
  };
  void quietCheck();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void quietCheck();
  });

  return {
    async check() {
      if (ready) return 'nieuw';
      const reg = await registration();
      if (!reg) return 'offline';
      const result = await checkForUpdate(reg);
      if (result === 'nieuw') ready = true;
      return result;
    },
    isReady: () => ready,
    onReady: (callback) => void listeners.push(callback),
    reload: () => location.reload(),
  };
}
