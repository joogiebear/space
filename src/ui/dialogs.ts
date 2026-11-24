import type { Loc } from '@/scenes/earth/location';
import { locationRequest } from './store';

/** Open the "your location" dialog; resolves with the chosen location, or null if cancelled. */
export function requestLocation(current: Loc | null): Promise<Loc | null> {
  return new Promise(resolve => {
    locationRequest.value = {
      current,
      resolve: loc => {
        locationRequest.value = null;
        resolve(loc);
      },
    };
  });
}
