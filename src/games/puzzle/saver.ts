/**
 * Bewaart pas als het even stil is: bij 500 stukjes is elke zet een stand van 500 stukjes. De laatste
 * waarde wint; `flush` schrijft direct (bij het verlaten van de puzzel), `cancel` gooit hem weg
 * (bij voltooien, zodat een oude tussenstand de uitslag niet overschrijft).
 */
export interface DebouncedSaver<T> {
  schedule(value: T): void;
  flush(): void;
  cancel(): void;
  hasPending(): boolean;
}

export function createDebouncedSaver<T>(save: (value: T) => void, delayMs: number): DebouncedSaver<T> {
  let pending: { value: T } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const flush = () => {
    clear();
    if (!pending) return;
    const { value } = pending;
    pending = undefined;
    save(value);
  };

  return {
    schedule(value) {
      pending = { value };
      clear();
      timer = setTimeout(flush, delayMs);
    },
    flush,
    cancel() {
      clear();
      pending = undefined;
    },
    hasPending: () => pending !== undefined,
  };
}
