export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PERSON_NAME_PATTERN = /^[\p{L}][\p{L}\p{M}' -]{1,79}$/u;

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateRegistration(input: Record<string, unknown>) {
  const name = text(input.name);
  const email = text(input.email).toLowerCase();
  const password = typeof input.password === 'string' ? input.password : '';
  const tenantName = text(input.tenantName);
  const tenantSlug = text(input.tenantSlug);

  if (!PERSON_NAME_PATTERN.test(name)) return { error: 'Enter a name using 2–80 letters, spaces, apostrophes, or hyphens.' };
  if (!EMAIL_PATTERN.test(email)) return { error: 'Enter a valid email address.' };
  if (password.length < 8 || password.length > 128) return { error: 'Password must be between 8 and 128 characters.' };
  if (!TENANT_SLUG_PATTERN.test(tenantSlug) || tenantSlug.length > 63) return { error: 'Organization slug must use lowercase letters, numbers, and single hyphens.' };
  if (tenantName && (tenantName.length < 2 || tenantName.length > 100)) return { error: 'Organization name must be between 2 and 100 characters.' };

  return { value: { name, email, password, tenantName, tenantSlug } };
}

export function validateRequest(input: Record<string, unknown>) {
  const title = text(input.title);
  const description = text(input.description);
  if (title.length < 3 || title.length > 120) return { error: 'Request title must be between 3 and 120 characters.' };
  if (description.length > 2_000) return { error: 'Request description cannot exceed 2,000 characters.' };
  return { value: { title, description: description || null } };
}

export function validateComment(value: unknown) {
  const content = text(value);
  if (content.length < 1 || content.length > 1_000) return { error: 'Comment must be between 1 and 1,000 characters.' };
  return { value: content };
}

export function validateDepartmentName(value: unknown) {
  const name = text(value);
  if (name.length < 2 || name.length > 80) return { error: 'Department name must be between 2 and 80 characters.' };
  return { value: name };
}
