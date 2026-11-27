/**
 * Water clarity ESTIMATE, version 0.
 *
 * Nobody measures visibility at Maui dive spots, so this is a rule of thumb
 * built from swell reaching the spot. It is always shown with an "Estimate"
 * label and a confidence level. Version 0 knows nothing yet about rain or
 * stream runoff (next milestone) and has not been calibrated against the
 * Hui O Ka Wai Ola turbidity samples, so confidence is capped at Low.
 */
import type { ClarityEstimate, Spot } from './types.js';
import type { BuoyObservation } from './feeds/ndbc.js';
import { M_TO_FT, inArc } from './util.js';

const RATINGS: ClarityEstimate['rating'][] = ['Murky', 'Poor', 'Fair', 'Good', 'Excellent'];

export function estimateClarity(spot: Spot, obs: BuoyObservation, buoyStale: boolean): ClarityEstimate {
  let score = 5;
  const reasons: string[] = [];
  const { from, to } = spot.exposure;

  // Swell energy only counts if it comes from a direction the spot is open to.
  const swellDir = obs.swell?.directionDeg ?? obs.meanDirectionDeg;
  const swellFt = (obs.swell?.heightM ?? obs.waveHeightM ?? 0) * M_TO_FT;
  const swellPeriod = obs.swell?.periodS ?? obs.dominantPeriodS ?? 0;
  const exposed = swellDir === null ? true : inArc(swellDir, from, to);

  if (exposed) {
    if (swellFt > 6) {
      score -= 3;
      reasons.push(`Big swell (${swellFt.toFixed(1)} ft) aimed at this spot stirs up the bottom`);
    } else if (swellFt > 4) {
      score -= 2;
      reasons.push(`Moderate swell (${swellFt.toFixed(1)} ft) reaching this spot`);
    } else if (swellFt > 2) {
      score -= 1;
      reasons.push(`Small swell (${swellFt.toFixed(1)} ft) reaching this spot`);
    } else {
      reasons.push('Little swell reaching this spot');
    }
    if (swellPeriod >= 13 && swellFt > 3) {
      score -= 1;
      reasons.push(`Long-period swell (${Math.round(swellPeriod)} s) means more surge near the bottom`);
    }
  } else {
    reasons.push('Main swell is coming from a direction this spot is sheltered from');
  }

  const ww = obs.windWave;
  if (ww?.heightM != null && ww.directionDeg != null && inArc(ww.directionDeg, from, to) && ww.heightM * M_TO_FT > 4) {
    score -= 1;
    reasons.push('Choppy wind waves reaching this spot');
  }

  score = Math.max(1, Math.min(5, score));
  reasons.push('Rain and stream runoff are not included yet');
  if (buoyStale) reasons.push('Buoy data is out of date');

  return { rating: RATINGS[score - 1], score, confidence: 'Low', reasons };
}
