# Maui Dive & Fish

Fishing and diving conditions for Maui spots, in one place: water clarity (estimate), swell, tides, sun and moon, with wind, runoff and 7-day history coming next.

**Product rules the code follows**

- Every number is labelled **Measured**, **Forecast**, **Estimate** or **Calculated**, with its source and time.
- Old data is never shown as current: it gets an orange "Old data · N h ago" chip and a banner. Clarity refuses to guess when its inputs are more than 12 h old.
- If a source goes down, the API serves the last good value (marked as cached) and the phone keeps its own saved copy for no-signal beaches.
- Safety disclaimer on every spot page: planning information, not a guarantee.

## What's in here

| Folder | What it is |
| --- | --- |
| `mobile/` | The app. React Native + Expo (Expo Router), TypeScript. Runs on iPhone, Android and web. |
| `server/` | The conditions API. Fetches and normalises NOAA data. Runs locally with `npm run dev`; deploys to Vercel as-is (`server/api/*.ts`). |
| `supabase/` | Database schema for cached readings and the 7-day history (not wired up yet). |

## Data sources (all free, public)

| Data | Source | Kind |
| --- | --- | --- |
| Swell (primary + wind swell) | NDBC 51205 Pauwela, Maui (CDIP 187) · NDBC 51213 Lanai Southwest (CDIP 239) | Measured, every 30 min |
| Tide highs/lows | NOAA CO-OPS Kahului Harbor 1615680 | Forecast |
| Water level now | NOAA CO-OPS Kahului Harbor 1615680 | Measured, every 6 min |
| Sunrise, sunset, moon | Calculated on the server (suncalc) | Calculated |
| Water clarity | This app's rule-of-thumb from swell vs. each spot's exposure | Estimate, Low confidence |

Not yet: wind (NWS + airport/Mesonet stations), rain and stream runoff (USGS), PacIOOS SWAN swell forecast, NWS alerts, 7-day history.

## Run it on your computer

You need [Node.js 22+](https://nodejs.org).

```bash
# 1. Start the API (terminal 1)
cd server
npm install
npm run dev                 # live NOAA data on http://localhost:3001
# or: DATA_MODE=fixtures npm run dev   (saved real samples, works offline)

# 2. Start the app (terminal 2)
cd mobile
npm install
npx expo start              # press w for web, or scan the QR code with Expo Go
```

On a phone with Expo Go, the phone can't see `localhost`. Copy `mobile/.env.example` to `mobile/.env.local` and put your computer's Wi-Fi address in `EXPO_PUBLIC_API_URL`.

Try the API directly: `http://localhost:3001/api/spots` and `http://localhost:3001/api/conditions?spot=olowalu`.

## Checks

```bash
cd server && npm test && npm run typecheck
cd mobile && npm run typecheck
```

GitHub Actions runs the same on every pull request.

## Accounts needed later (none needed to run locally)

| Service | Why | When |
| --- | --- | --- |
| **Vercel** (free Hobby plan to start) | Host the API; scheduled jobs that fetch data every 10-30 min | When we want the app to work away from your computer. Import this repo, set **Root Directory = `server`**. |
| **Supabase** (free plan) | Store readings so outages and the 7-day history work across restarts | With the history screen. Run `supabase/schema.sql`, then add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel. |
| **Expo / EAS** (free) | Build the iPhone and Android apps, test with real users via TestFlight / internal testing | When it's ready for testers. |
| **Apple Developer** ($99/yr) and **Google Play** ($25 once) | Publish to the stores | At launch. |

## Known limitations

- Spot coordinates and swell-exposure arcs are first guesses and need local review.
- South Maui has no buoy; those spots use the Lanai buoy as a proxy.
- The clarity estimate ignores rain and runoff and is not yet calibrated against Hui O Ka Wai Ola turbidity samples, so its confidence is always Low.
- Kahului is Maui's only tide station; tide times elsewhere can differ by up to an hour.
