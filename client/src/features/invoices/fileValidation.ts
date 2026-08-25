export type InvoiceFileValidationCode =
  | 'EMPTY_FILE'
  | 'TOO_LARGE'
  | 'UNSAFE_NAME'
  | 'UNSUPPORTED_TYPE'
  | 'TYPE_EXTENSION_MISMATCH';

export class InvoiceFileValidationError extends Error {
  constructor(
    public readonly code: InvoiceFileValidationCode,
    message: string,
  ) {
    super(message);
    this.name = 'InvoiceFileValidationError';
  }
}

export const MAX_INVOICE_FILE_BYTES = 20 * 1024 * 1024;

const ALLOWED: Record<string, readonly string[]> = {
  '.pdf': ['application/pdf'],
  '.csv': ['text/csv', 'application/csv'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
};

function extensionOf(name: string) {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index).toLowerCase() : '';
}

export async function validateInvoiceFile(file: File) {
  if (/[\u0000-\u001f\u007f]/.test(file.name)) {
    throw new InvoiceFileValidationError('UNSAFE_NAME', 'Invoice filename contains unsafe control characters.');
  }
  if (file.size === 0) {
    throw new InvoiceFileValidationError('EMPTY_FILE', 'Invoice file is empty.');
  }
  if (file.size > MAX_INVOICE_FILE_BYTES) {
    throw new InvoiceFileValidationError('TOO_LARGE', 'Invoice file exceeds the 20 MiB client preflight limit.');
  }

  const extension = extensionOf(file.name);
  const allowedTypes = ALLOWED[extension];
  if (!allowedTypes) {
    throw new InvoiceFileValidationError('UNSUPPORTED_TYPE', 'Only PDF, CSV, JPEG, and PNG invoice files are supported.');
  }
  if (!allowedTypes.includes(file.type)) {
    const knownMime = Object.values(ALLOWED).some((types) => types.includes(file.type));
    throw new InvoiceFileValidationError(
      knownMime ? 'TYPE_EXTENSION_MISMATCH' : 'UNSUPPORTED_TYPE',
      knownMime
        ? 'Invoice file extension does not match its declared content type.'
        : 'Invoice content type is not supported.',
    );
  }

  return file;
}

export async function sha256File(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
