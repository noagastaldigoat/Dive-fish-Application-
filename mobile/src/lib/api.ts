import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Spot, SpotConditions } from './types';

import { Platform } from 'react-native';

/** The live API on Vercel. */
export const PRODUCTION_API_URL = 'https://dive-fish-application-server.vercel.app';

/**
 * Where the conditions API lives.
 * - EXPO_PUBLIC_API_URL wins if set (e.g. http://192.168.1.20:3001 to test a local server from a phone).
 * - Web: same site as the page (the web app is served by the API's Vercel project),
 *   except on localhost, where the local server runs on port 3001.
 * - iPhone/Android: the live Vercel API.
 */
function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:3001' : '';
  }
  return PRODUCTION_API_URL;
}

export const API_URL = resolveApiUrl();

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
