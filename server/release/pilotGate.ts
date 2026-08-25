import { z } from 'zod';
import type { RegionalGateResult } from './regionalGate';
import type { ReconciliationRecord } from '../../shared/contracts/reconciliation';

export const PilotGateResultSchema = z.object({
  result: z.enum(['PASS', 'FAIL']),
  regionalGate: z.enum(['PASS', 'FAIL']),
  completeRealReconciliations: z.number().int().nonnegative(),
  errorClass: z.string().nullable(),
}).strict();

export type PilotGateResult = z.infer<typeof PilotGateResultSchema>;

export function evaluatePilotGate(regionalGate: RegionalGateResult, reconciliations: ReconciliationRecord[]): PilotGateResult {
  const complete = reconciliations.filter((record) => record.status === 'COMPLETE' && Boolean(record.findingId)).length;
  const pass = regionalGate.result === 'PASS' && complete >= 1;
  return PilotGateResultSchema.parse({
    result: pass ? 'PASS' : 'FAIL',
    regionalGate: regionalGate.result,
    completeRealReconciliations: complete,
    errorClass: pass ? null : regionalGate.result !== 'PASS' ? 'REGIONAL_VENDOR_GATE_NOT_PASS' : 'REAL_RECONCILIATION_REQUIRED',
  });
}
