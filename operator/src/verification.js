// Verification layer — independent "proof of work". The whole point of the product:
// nothing is "done" until an action is independently proven to have actually worked.
// In production each branch is a real check (HTTP probe, deliverability API, ad-platform
// status, CMS publish state); here it inspects the proof object the worker returns.

/**
 * @param {object} action  { kind, proof, ... }
 * @returns {boolean} whether the action is independently verified
 */
export function verifyAction(action) {
  const p = action.proof ?? {};
  switch (action.kind) {
    case 'deploy':
      return p.status === 200 && p.renders === true; // URL returns 200 and renders
    case 'email':
      return p.delivered === true && p.bounced !== true; // landed, not bounced
    case 'ad':
      return p.live === true && p.withinBudget === true; // campaign live within cap
    case 'content':
      return p.published === true; // post actually published
    default:
      return p.ok === true;
  }
}
