export interface Profile {
  id: string;
  name: string;
  color: string;
  avatar: string;
  drawerSide: 'left' | 'right';
  soundOn: boolean;
}

export interface ProfileStore {
  list(): Promise<Profile[]>;
  get(id: string): Promise<Profile | undefined>;
  /** Maakt het profiel aan of overschrijft het. */
  put(profile: Profile): Promise<void>;
  /** Verwijdert het profiel en alle voortgang daarvan. */
  remove(id: string): Promise<void>;
}

/** Opslag per profiel en spel. */
export interface ProgressStore {
  load<T>(profileId: string, gameId: string): Promise<T | undefined>;
  save<T>(profileId: string, gameId: string, data: T): Promise<void>;
}

/** Wat het platform aan een spel meegeeft; het spel kent verder geen opslagdetails. */
export interface GameContext {
  profile: Profile;
  progress: {
    load<T>(): Promise<T | undefined>;
    save<T>(data: T): Promise<void>;
  };
  /** Terug naar het spellenoverzicht (huisknop). */
  exit(): void;
}

/** Samenvatting voor de tegel in het spellenoverzicht, bijvoorbeeld het aantal sterren. */
export interface ProgressSummary {
  stars: number;
}

export interface GameModule {
  id: string;
  name: string;
  /** Emoji of pad naar een afbeelding. */
  icon: string;
  /** Start het spel in `root`; geeft een opruimfunctie terug. */
  start(root: HTMLElement, ctx: GameContext): void | (() => void);
  summarize(progress: unknown): ProgressSummary;
}
