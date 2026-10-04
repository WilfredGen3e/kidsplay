import type { GameModule } from './types';

const games = new Map<string, GameModule>();

export function registerGame(game: GameModule): void {
  if (games.has(game.id)) throw new Error(`Spel al aangemeld: ${game.id}`);
  games.set(game.id, game);
}

export function getGames(): GameModule[] {
  return [...games.values()];
}

export function getGame(id: string): GameModule | undefined {
  return games.get(id);
}
