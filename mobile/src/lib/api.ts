import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Spot, SpotConditions } from './types';

/**
 * Where the conditions API lives. Locally: `cd server && npm run dev`.
 * On a phone using Expo Go, set EXPO_PUBLIC_API_URL to your computer's LAN
 * address (e.g. http://192.168.1.20:3001). In production: the Vercel URL.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface Loaded<T> {
  data: T;
  /** True when the network failed and this came from the phone's saved copy. */
  offline: boolean;
  savedAt: string;
}

async function getWithOfflineCopy<T>(path: string): Promise<Loaded<T>> {
  const key = `cache:${path}`;
  try {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    const savedAt = new Date().toISOString();
    AsyncStorage.setItem(key, JSON.stringify({ data, savedAt })).catch(() => {});
    return { data, offline: false, savedAt };
  } catch (e) {
    const saved = await AsyncStorage.getItem(key).catch(() => null);
    if (saved) {
      const { data, savedAt } = JSON.parse(saved) as { data: T; savedAt: string };
      return { data, offline: true, savedAt };
    }
    throw e;
  }
}

export const getSpots = () => getWithOfflineCopy<{ spots: Spot[] }>('/api/spots');
export const getConditions = (id: string) =>
  getWithOfflineCopy<SpotConditions>(`/api/conditions?spot=${encodeURIComponent(id)}`);
