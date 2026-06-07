// Validation gate — the demand check that runs BEFORE any spend.
//
// Polsia's single most-cited failure is executing on an unvalidated idea. This gate
// scores demand signals into a red/green verdict; the loop refuses to build on "red"
// without an explicit override.

const FACTOR_WEIGHTS = Object.freeze({
  searchDemand: 0.35, // keyword / search-volume signal
  competitorGap: 0.25, // is there an underserved gap vs. competitor density?
  icpClarity: 0.2, // how well-defined is the ideal customer profile?
  willingnessToPay: 0.2, // WTP signals from Reddit/X/review sites
});

export const GREEN_THRESHOLD = 0.6;

/**
 * @param {object} objective  { id, vertical, idea }
 * @param {object} signals    each factor in [0,1]; missing factors default to 0.5
 * @returns {{score:number, verdict:'green'|'red', factors:object}}
 */
export function validateIdea(objective, signals = {}) {
  const factors = {
    searchDemand: signals.searchDemand ?? 0.5,
    competitorGap: signals.competitorGap ?? 0.5,
    icpClarity: signals.icpClarity ?? 0.5,
    willingnessToPay: signals.willingnessToPay ?? 0.5,
  };
  const score = Object.entries(FACTOR_WEIGHTS).reduce((s, [k, w]) => s + factors[k] * w, 0);
  return {
    score: Number(score.toFixed(3)),
    verdict: score >= GREEN_THRESHOLD ? 'green' : 'red',
    factors,
  };
}
