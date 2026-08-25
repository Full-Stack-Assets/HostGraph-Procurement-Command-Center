import { createHash } from 'node:crypto';
import path from 'node:path';

export const MAX_INVOICE_FILE_BYTES = 20 * 1024 * 1024;

export type InvoiceUploadValidationCode =
  | 'EMPTY_FILE'
  | 'TOO_LARGE'
  | 'UNSAFE_NAME'
  | 'UNSUPPORTED_TYPE'
  | 'TYPE_EXTENSION_MISMATCH'
  | 'MALFORMED_CONTENT';

export class InvoiceUploadValidationError extends Error {
  constructor(
    public readonly code: InvoiceUploadValidationCode,
    message: string,
  ) {
    super(message);
    this.name = 'InvoiceUploadValidationError';
  }
}

export interface ValidatedInvoiceUpload {
  originalName: string;
  mimeType: 'application/pdf' | 'text/csv' | 'image/jpeg' | 'image/png';
  extension: '.pdf' | '.csv' | '.jpg' | '.jpeg' | '.png';
  checksumSha256: string;
  size: number;
}

const MIME_BY_EXTENSION: Record<ValidatedInvoiceUpload['extension'], readonly string[]> = {
  '.pdf': ['application/pdf'],
  '.csv': ['text/csv', 'application/csv'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
};

function extensionOf(name: string) {
  return path.extname(name).toLowerCase() as ValidatedInvoiceUpload['extension'];
}

function assertSafeName(originalName: string) {
  if (!originalName || originalName !== path.basename(originalName)) {
    throw new InvoiceUploadValidationError('UNSAFE_NAME', 'Invoice filename must not contain a path.');
  }
  if (/[\u0000-\u001f\u007f]/.test(originalName) || originalName.includes('..') || /[\\/]/.test(originalName)) {
    throw new InvoiceUploadValidationError('UNSAFE_NAME', 'Invoice filename contains unsafe characters.');
  }
}

function detectBinaryType(buffer: Buffer): 'application/pdf' | 'image/jpeg' | 'image/png' | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return 'image/png';
  return null;
}

function validateCsv(buffer: Buffer) {
  if (buffer.includes(0)) {
    throw new InvoiceUploadValidationError('MALFORMED_CONTENT', 'CSV invoice contains binary NUL bytes.');
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new InvoiceUploadValidationError('MALFORMED_CONTENT', 'CSV invoice is not valid UTF-8 text.');
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new InvoiceUploadValidationError('EMPTY_FILE', 'Invoice file is empty.');
  }

  const disallowedControl = /[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
  if (disallowedControl.test(trimmed)) {
    throw new InvoiceUploadValidationError('MALFORMED_CONTENT', 'CSV invoice contains unsupported control characters.');
  }

  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const delimiter = [',', '\t', ';'].find((candidate) => lines[0]?.includes(candidate));
  if (!delimiter) {
    throw new InvoiceUploadValidationError('MALFORMED_CONTENT', 'CSV invoice must contain a delimited header row.');
  }

  const expectedColumns = lines[0].split(delimiter).length;
  if (expectedColumns < 2 || lines.some((line) => line.split(delimiter).length !== expectedColumns)) {
    throw new InvoiceUploadValidationError('MALFORMED_CONTENT', 'CSV invoice has inconsistent column structure.');
  }
}

export function validateInvoiceUpload(
  buffer: Buffer,
  originalName: string,
  declaredMime: string,
  maxBytes = MAX_INVOICE_FILE_BYTES,
): ValidatedInvoiceUpload {
  assertSafeName(originalName);
  if (buffer.length === 0) throw new InvoiceUploadValidationError('EMPTY_FILE', 'Invoice file is empty.');
  if (buffer.length > maxBytes) throw new InvoiceUploadValidationError('TOO_LARGE', 'Invoice file exceeds the 20 MiB limit.');

  const extension = extensionOf(originalName);
  if (!Object.prototype.hasOwnProperty.call(MIME_BY_EXTENSION, extension)) {
    throw new InvoiceUploadValidationError('UNSUPPORTED_TYPE', 'Only PDF, CSV, JPEG, and PNG invoice files are supported.');
  }

  const declaredAllowed = MIME_BY_EXTENSION[extension].includes(declaredMime);
  if (!declaredAllowed) {
    throw new InvoiceUploadValidationError('TYPE_EXTENSION_MISMATCH', 'Invoice extension does not match the declared MIME type.');
  }

  let detectedMime: ValidatedInvoiceUpload['mimeType'];
  if (extension === '.csv') {
    validateCsv(buffer);
    detectedMime = 'text/csv';
  } else {
    const detected = detectBinaryType(buffer);
    if (!detected) {
      throw new InvoiceUploadValidationError('MALFORMED_CONTENT', 'Invoice file signature is not a supported document type.');
    }
    const expected = extension === '.pdf' ? 'application/pdf' : extension === '.png' ? 'image/png' : 'image/jpeg';
    if (detected !== expected) {
      throw new InvoiceUploadValidationError('TYPE_EXTENSION_MISMATCH', 'Invoice extension does not match detected file bytes.');
    }
    detectedMime = detected;
  }

  return {
    originalName,
    mimeType: detectedMime,
    extension,
    checksumSha256: createHash('sha256').update(buffer).digest('hex'),
    size: buffer.length,
  };
}
