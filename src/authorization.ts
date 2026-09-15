export type ApplicationUser = {
  isHost: boolean;
  role?: string;
};

export type Permission =
  | 'request:read'
  | 'request:create'
  | 'request:modify'
  | 'request:comment'
  | 'department:manage'
  | 'membership:manage'
  | 'user:list'
  | 'user:delete'
  | 'notification:read';

export const AUTHORIZATION_MATRIX: Record<Permission, readonly string[]> = {
  'request:read': ['Host', 'Admin', 'Employee'],
  'request:create': ['Host', 'Admin', 'Employee'],
  'request:modify': ['Host', 'Admin'],
  'request:comment': ['Host', 'Admin', 'Employee'],
  'department:manage': ['Host', 'Admin'],
  'membership:manage': ['Host', 'Admin'],
  'user:list': ['Host'],
  'user:delete': ['Host'],
  'notification:read': ['Host', 'Admin', 'Employee']
};

export function roleFor(user: ApplicationUser) {
  return user.isHost ? 'Host' : user.role === 'Admin' ? 'Admin' : 'Employee';
}

export function isAllowed(user: ApplicationUser, permission: Permission) {
  return AUTHORIZATION_MATRIX[permission].includes(roleFor(user));
}
