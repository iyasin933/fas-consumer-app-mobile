import parsePhoneNumberFromString from 'libphonenumber-js';

/**
 * Combines the country dial code and the local number the same way the
 * DropYou load payload does, then validates with libphonenumber-js.
 * Matches the server's `recipient.phone` validator so invalid numbers are
 * caught client-side instead of surfacing as a 422.
 */
export function isValidRecipientPhone(dialCode: string, localNumber: string): boolean {
  const dial = (dialCode || '').trim() || '+44';
  const local = (localNumber || '').trim();
  if (!local) return false;
  const raw = local.startsWith('+') ? local : `${dial}${local.replace(/[^\d]/g, '')}`;
  const parsed = parsePhoneNumberFromString(raw);
  return Boolean(parsed && parsed.isValid());
}
