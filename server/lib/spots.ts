import type { Spot } from './types.js';

/**
 * Starter set of Maui spots. Coordinates are approximate entry points and the
 * exposure arcs are first guesses from the coastline; both should be reviewed
 * with local divers and fishermen before launch.
 *
 * buoyId picks the closest relevant swell buoy. Maui has no buoy off the south
 * or east shore, so south-side spots use the Lanai buoy as a proxy (noted in
 * the app as lower confidence).
 */
// Backups when Maui's own buoys are down (both were offline in Nov 2026).
// Other islands' buoys only roughly match what reaches Maui, so the app says
// which buoy it used and why.
const NORTH_BACKUPS = ['51201', '51202']; // Waimea Bay (NW swell), Mokapu Point (N/NE)
const SOUTH_BACKUPS = ['51211']; // Pearl Harbor entrance (south swell)

export const SPOTS: Spot[] = [
  {
    id: 'olowalu',
    name: 'Olowalu',
    area: 'West Maui',
    activities: ['dive', 'fish'],
    lat: 20.809,
    lon: -156.622,
    buoyId: '51213',
    backupBuoyIds: SOUTH_BACKUPS,
    exposure: { from: 170, to: 270 },
    notes: 'Shallow reef; clouds up fast after rain in the valley. Swell from the Lanai buoy is a proxy.',
  },
  {
    id: 'honolua',
    name: 'Honolua Bay',
    area: 'West Maui',
    activities: ['dive'],
    lat: 21.014,
    lon: -156.638,
    buoyId: '51205',
    backupBuoyIds: NORTH_BACKUPS,
    exposure: { from: 280, to: 20 },
    notes: 'Best in summer. Any NW swell turns it murky and dangerous.',
  },
  {
    id: 'makena',
    name: 'Mākena Landing',
    area: 'South Maui',
    activities: ['dive', 'fish'],
    lat: 20.654,
    lon: -156.443,
    buoyId: '51213',
    backupBuoyIds: SOUTH_BACKUPS,
    exposure: { from: 160, to: 280 },
  },
  {
    id: 'ahihi',
    name: 'ʻĀhihi-Kīnaʻu',
    area: 'South Maui',
    activities: ['dive'],
    lat: 20.601,
    lon: -156.422,
    buoyId: '51213',
    backupBuoyIds: SOUTH_BACKUPS,
    exposure: { from: 150, to: 270 },
    notes: 'Natural Area Reserve: no fishing or taking of marine life.',
  },
  {
    id: 'molokini',
    name: 'Molokini Crater',
    area: 'Offshore South Maui',
    activities: ['dive'],
    lat: 20.633,
    lon: -156.496,
    buoyId: '51213',
    backupBuoyIds: SOUTH_BACKUPS,
    exposure: { from: 120, to: 300 },
    notes: 'Boat access only. Marine Life Conservation District.',
  },
  {
    id: 'kanaha',
    name: 'Kanahā',
    area: 'North Shore',
    activities: ['fish'],
    lat: 20.901,
    lon: -156.442,
    buoyId: '51205',
    backupBuoyIds: NORTH_BACKUPS,
    exposure: { from: 300, to: 90 },
  },
  {
    id: 'kahului-breakwall',
    name: 'Kahului Breakwall',
    area: 'North Shore',
    activities: ['fish'],
    lat: 20.899,
    lon: -156.472,
    buoyId: '51205',
    backupBuoyIds: NORTH_BACKUPS,
    exposure: { from: 315, to: 45 },
  },
];

export function getSpot(id: string): Spot | undefined {
  return SPOTS.find((s) => s.id === id);
}
