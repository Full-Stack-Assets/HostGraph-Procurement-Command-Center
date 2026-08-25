import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DataStatusRail } from '../client/src/components/DataStatusRail';
import { FindingInspector } from '../client/src/components/FindingInspector';
import type { Finding } from '../shared/contracts/findings';

const demoFinding: Finding = {
  id: 'demo-mozz-001',
  accountId: 'demo-boston-portfolio',
  locationId: 'Back Bay',
  vendorId: 'Sysco',
  sourceRecordIds: ['fixture:mozz-001'],
  sourcePeriod: { from: '2026-03-01', to: '2026-03-31' },
  observedAmount: 3.92,
  calculatedVariance: 0.7,
  calculationMethod: 'synthetic-actual-minus-theoretical-unit-cost',
  calculationVersion: 'demo-v1',
  confidence: 0,
  evidenceState: 'DETECTED',
  reviewerState: 'UNREVIEWED',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-31T00:00:00.000Z',
  provenance: [
    {
      sourceSystem: 'HostGraph synthetic fixture',
      sourceRecordId: 'fixture:mozz-001',
      locator: 'client/src/data/mockData.ts#mozz-001',
    },
  ],
};

describe('DataStatusRail', () => {
  it('shows DEMO state without inventing unavailable operational metrics', () => {
    const html = renderToStaticMarkup(
      <DataStatusRail
        mode="DEMO"
        fetchedAt={null}
        sourceCoverage={null}
        invoicesProcessed={null}
        invoicesAwaitingReview={null}
        dataExceptions={null}
      />,
    );

    expect(html).toContain('Synthetic demo data');
    expect(html).toContain('DEMO');
    expect(html.match(/Unavailable/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).not.toContain('10 / 10');
  });

  it('renders supplied LIVE coverage and operational counts verbatim', () => {
    const html = renderToStaticMarkup(
      <DataStatusRail
        mode="LIVE"
        fetchedAt="2026-08-25T21:00:00.000Z"
        sourceCoverage={{ available: 5, required: 10 }}
        invoicesProcessed={12}
        invoicesAwaitingReview={3}
        dataExceptions={1}
      />,
    );

    expect(html).toContain('Validated live data');
    expect(html).toContain('5 / 10');
    expect(html).toContain('12');
    expect(html).toContain('3');
    expect(html).toContain('1');
  });
});

describe('FindingInspector', () => {
  it('labels synthetic detected variance without calling it confirmed or realized savings', () => {
    const html = renderToStaticMarkup(<FindingInspector mode="DEMO" finding={demoFinding} />);

    expect(html).toContain('Synthetic demonstration only');
    expect(html).toContain('Detected variance');
    expect(html).toContain('$0.70');
    expect(html).toContain('Client-confirmed value');
    expect(html).toContain('Not confirmed');
    expect(html).toContain('Realized value');
    expect(html).toContain('Not realized');
    expect(html).toContain('client/src/data/mockData.ts#mozz-001');
    expect(html).not.toContain('Savings');
  });

  it('fails closed when a LIVE analytical row lacks a full evidence record', () => {
    const html = renderToStaticMarkup(
      <FindingInspector
        mode="LIVE"
        finding={null}
        unavailableReason="Current margin API does not yet expose a source-complete Finding record."
      />,
    );

    expect(html).toContain('Evidence record unavailable');
    expect(html).toContain('Current margin API does not yet expose a source-complete Finding record.');
    expect(html).not.toContain('Detected variance');
  });
});
