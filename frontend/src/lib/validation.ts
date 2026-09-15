export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PERSON_NAME_PATTERN = /^[\p{L}][\p{L}\p{M}' -]{1,79}$/u;

export function validateSignUp(values: { name: string; email: string; password: string; tenantName: string; tenantSlug: string }) {
  if (!PERSON_NAME_PATTERN.test(values.name.trim())) return 'Enter a name using 2–80 letters, spaces, apostrophes, or hyphens.';
  if (!EMAIL_PATTERN.test(values.email.trim())) return 'Enter a valid email address.';
  if (values.password.length < 8 || values.password.length > 128) return 'Password must be between 8 and 128 characters.';
  if (!TENANT_SLUG_PATTERN.test(values.tenantSlug.trim()) || values.tenantSlug.trim().length > 63) return 'Organization slug must use lowercase letters, numbers, and single hyphens.';
  if (values.tenantName.trim() && (values.tenantName.trim().length < 2 || values.tenantName.trim().length > 100)) return 'Organization name must be between 2 and 100 characters.';
  return null;
}

export function validateLogin(values: { email: string; password: string }) {
  if (!EMAIL_PATTERN.test(values.email.trim())) return 'Enter a valid email address.';
  if (!values.password) return 'Enter your password.';
  return null;
}

export function validateRequest(values: { title: string; description: string }) {
  if (values.title.trim().length < 3 || values.title.trim().length > 120) return 'Request title must be between 3 and 120 characters.';
  if (values.description.trim().length > 2_000) return 'Request description cannot exceed 2,000 characters.';
  return null;
}

export function validateComment(content: string) {
  if (content.trim().length < 1 || content.trim().length > 1_000) return 'Comment must be between 1 and 1,000 characters.';
  return null;
}
