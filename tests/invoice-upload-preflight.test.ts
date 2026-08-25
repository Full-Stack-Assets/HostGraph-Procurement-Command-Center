import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('invoice upload preflight integration', () => {
  it('does not issue a network request for a rejected invoice file', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['MZ'], 'invoice.pdf', { type: 'application/x-msdownload' });

    await expect(api.uploadInvoice(file)).rejects.toMatchObject({ code: 'UNSUPPORTED_TYPE' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('adds the content SHA-256 fingerprint to the upload payload', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_path: string, init: RequestInit) => {
      const form = init.body as FormData;
      expect(form.get('file')).toBeInstanceOf(File);
      expect(String(form.get('checksumSha256'))).toMatch(/^[a-f0-9]{64}$/);
      return new Response(JSON.stringify({ message: 'accepted', jobId: 'job-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.uploadInvoice(new File(['abc'], 'invoice.csv', { type: 'text/csv' }))).resolves.toMatchObject({ jobId: 'job-1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
