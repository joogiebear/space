import { requestLocation } from '@/ui/dialogs';

/** The viewer's location for pass prediction. It lives only in this browser's localStorage. */
export interface Loc {
  lat: number;
  lon: number;
}

const KEY = 'atlas.loc';

export function loadLocation(): Loc | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) as string);
  } catch {
    return null;
  }
}

export function saveLocation(loc: Loc) {
  try {
    localStorage.setItem(KEY, JSON.stringify(loc));
  } catch {
    /* storage blocked */
  }
}

/** Opens the in-page dialog (a Vue component). Resolves to the new location, or null if cancelled. */
export const askLocation = requestLocation;
