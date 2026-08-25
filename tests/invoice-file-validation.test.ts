import { describe, expect, it } from 'vitest';
import {
  InvoiceFileValidationError,
  sha256File,
  validateInvoiceFile,
} from '@/features/invoices/fileValidation';

describe('invoice file preflight', () => {
  it('rejects executable content type masquerading behind a PDF extension', async () => {
    const file = new File(['MZ'], 'invoice.pdf', { type: 'application/x-msdownload' });
    await expect(validateInvoiceFile(file)).rejects.toMatchObject({ code: 'UNSUPPORTED_TYPE' });
  });

  it('rejects empty files and unsafe control characters in names', async () => {
    await expect(validateInvoiceFile(new File([], 'invoice.pdf', { type: 'application/pdf' }))).rejects.toMatchObject({ code: 'EMPTY_FILE' });
    await expect(validateInvoiceFile(new File(['x'], 'bad\u0000name.pdf', { type: 'application/pdf' }))).rejects.toMatchObject({ code: 'UNSAFE_NAME' });
  });

  it('rejects files over 20 MiB', async () => {
    const file = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' });
    await expect(validateInvoiceFile(file)).rejects.toMatchObject({ code: 'TOO_LARGE' });
  });

  it('accepts PDF, CSV, JPEG, and PNG and produces a deterministic SHA-256 fingerprint', async () => {
    for (const [name, type] of [
      ['invoice.pdf', 'application/pdf'],
      ['invoice.csv', 'text/csv'],
      ['invoice.jpg', 'image/jpeg'],
      ['invoice.png', 'image/png'],
    ] as const) {
      const file = new File(['abc'], name, { type });
      await expect(validateInvoiceFile(file)).resolves.toBe(file);
    }

    const digest1 = await sha256File(new File(['abc'], 'a.csv', { type: 'text/csv' }));
    const digest2 = await sha256File(new File(['abc'], 'b.csv', { type: 'text/csv' }));
    expect(digest1).toBe(digest2);
    expect(digest1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('uses a typed validation error', () => {
    const error = new InvoiceFileValidationError('EMPTY_FILE', 'Empty');
    expect(error.code).toBe('EMPTY_FILE');
  });
});
