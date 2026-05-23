export function validateRequiredName(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < 2) return `${label} must be at least 2 characters.`;
  return null;
}

export function validateEmail(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function getPasswordRules(password: string) {
  return {
    length: password.length >= 8,
    symbolOrNumber: /[\d\W_]/.test(password),
  };
}

export function validatePassword(password: string) {
  const rules = getPasswordRules(password);
  if (!password) return 'Password is required.';
  if (!rules.length) return 'Use at least 8 characters.';
  if (!rules.symbolOrNumber) return 'Add at least 1 number or special character.';
  return null;
}

export function validateConfirmPassword(password: string, confirm: string) {
  if (!confirm) return 'Confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}
