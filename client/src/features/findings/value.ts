import type { Finding, FindingValueBreakdown } from '@shared/contracts/findings';

export function summarizeFindingValues(findings: Finding[]): FindingValueBreakdown {
  return findings.reduce<FindingValueBreakdown>(
    (totals, finding) => {
      const value = finding.calculatedVariance;
      if (finding.evidenceState === 'OBSERVED') return totals;

      totals.detected += value;
      if (finding.evidenceState === 'CLIENT_CONFIRMED' || finding.evidenceState === 'REALIZED') {
        totals.clientConfirmed += value;
      }
      if (finding.evidenceState === 'REALIZED') {
        totals.realized += value;
      }
      return totals;
    },
    { detected: 0, clientConfirmed: 0, realized: 0 },
  );
}
