/**
 * Toegangscode voor de beheerconsole. Dit is een slot op het scherm, geen beveiliging:
 * de code staat in de publieke pagina. Schrijven kan alleen met het GitHub-token.
 */
export const ACCESS_CODE = '6402';

const UNLOCKED_KEY = 'kidsplay-beheer-unlocked';

export function isAccessCode(input: string): boolean {
  return input.replace(/\D/g, '') === ACCESS_CODE;
}

/** Ontgrendeld blijft zolang dit tabblad open is. */
export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCKED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCKED_KEY, '1');
  } catch {
    // Zonder sessionStorage vraagt de console de code bij elke herlading opnieuw.
  }
}
