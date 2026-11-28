import { useColorScheme } from 'react-native';

const light = {
  bg: '#F3F7F9',
  card: '#FFFFFF',
  text: '#0E2A36',
  muted: '#5B7380',
  border: '#DCE5EA',
  accent: '#0A7EA4',
  measured: '#0A7EA4',
  forecast: '#4A6B7A',
  estimate: '#7B4FC9',
  stale: '#C2610C',
  staleBg: '#FFF1E3',
  danger: '#B3261E',
};

const dark: typeof light = {
  bg: '#08161D',
  card: '#10232C',
  text: '#E6F1F5',
  muted: '#8FA6B1',
  border: '#1F3843',
  accent: '#4CC2E8',
  measured: '#4CC2E8',
  forecast: '#9DB6C2',
  estimate: '#B69AF0',
  stale: '#F0A04B',
  staleBg: '#3A2614',
  danger: '#F2B8B5',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
