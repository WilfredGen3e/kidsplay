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

/** Gegevens van één spel buiten de voortgang, bijvoorbeeld de puzzels zelf. Afbeeldingen mogen als Blob. */
export interface GameData {
  list<T>(collection: string): Promise<T[]>;
  get<T>(collection: string, id: string): Promise<T | undefined>;
  put<T>(collection: string, id: string, value: T): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
}

/** Opslag voor spelgegevens, gescheiden per spel. */
export interface RecordStore {
  list<T>(gameId: string, collection: string): Promise<T[]>;
  get<T>(gameId: string, collection: string, id: string): Promise<T | undefined>;
  put<T>(gameId: string, collection: string, id: string, value: T): Promise<void>;
  remove(gameId: string, collection: string, id: string): Promise<void>;
}

/** Wat het platform aan een spel meegeeft; het spel kent verder geen opslagdetails. */
/** Stand van het sparen voor het stickerboek. */
export interface SavingsInfo {
  /** Punten richting de volgende sticker. */
  have: number;
  need: number;
  remaining: number;
  /** Cadeautjes die het kind nu mag openmaken (0 zolang er geen stickers zijn om te winnen). */
  gifts: number;
}

export interface GameContext {
  profile: Profile;
  data: GameData;
  progress: {
    load<T>(): Promise<T | undefined>;
    save<T>(data: T): Promise<void>;
  };
  /** Spaarpunten voor het stickerboek: 1 punt per vastgeklikt stukje (of ander kleinste succes in een spel). */
  addPoints(count: number): Promise<void>;
  /** Huidige spaarstand, bijvoorbeeld voor na afloop van een spel. */
  savings(): Promise<SavingsInfo>;
  /** Opent het cadeautjesscherm; daarna komt het kind in het spellenoverzicht. */
  openGifts(): void;
  /** Terug naar het spellenoverzicht (huisknop). */
  exit(): void;
}

/** Samenvatting voor de tegel in het spellenoverzicht, bijvoorbeeld het aantal sterren. */
export interface ProgressSummary {
  stars: number;
}

/** Een regel in het voortgangsoverzicht van de ouder. */
export interface OverviewRow {
  title: string;
  /** Object-URL of data-URL van een plaatje. */
  image?: string;
  details: string[];
  done: boolean;
}

/** Wat het platform aan het ouderdeel van een spel meegeeft. */
export interface ManageContext {
  profiles: Profile[];
  data: GameData;
  /** Terug naar het ouderdeel. */
  back(): void;
}

export interface GameModule {
  id: string;
  name: string;
  /** Emoji of pad naar een afbeelding. */
  icon: string;
  /** Start het spel in `root`; geeft een opruimfunctie terug. */
  start(root: HTMLElement, ctx: GameContext): void | (() => void);
  summarize(progress: unknown): ProgressSummary;
  /** Spaarpunten die al verdiend zijn met eerdere voortgang; eenmalig gebruikt om het stickerboek te vullen. */
  earnedPoints?(progress: unknown): number;
  /** Eenmalig bij het opstarten, bijvoorbeeld om een voorbeeldpuzzel klaar te zetten. */
  init?(data: GameData): Promise<void>;
  /** Beheerscherm voor de ouder (puzzels maken, moeilijkheid). */
  manage?(root: HTMLElement, ctx: ManageContext): void | (() => void);
  /** Regels voor het voortgangsoverzicht van één kind. */
  overview?(progress: unknown, data: GameData): Promise<OverviewRow[]>;
}
