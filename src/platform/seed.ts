import type { ProfileStore } from './types';

/** Tijdelijk: voorbeeldprofielen tot het ouderdeel profielen kan aanmaken. */
export async function seedDemoProfiles(store: ProfileStore): Promise<void> {
  if ((await store.list()).length > 0) return;
  await store.put({ id: 'demo-1', name: 'Anna', color: '#e8590c', avatar: '🦊', drawerSide: 'right', soundOn: true });
  await store.put({ id: 'demo-2', name: 'Bram', color: '#1c7ed6', avatar: '🐳', drawerSide: 'right', soundOn: true });
}
