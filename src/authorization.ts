export type ApplicationUser = {
  isHost: boolean;
  role?: string;
};

export const REQUEST_VIEW = 'request:view';
export const REQUEST_CREATE = 'request:create';
export const REQUEST_UPDATE = 'request:update';
export const REQUEST_DELETE = 'request:delete';
export const REQUEST_COMMENT = 'request:comment';
export const DEPARTMENT_MANAGE = 'department:manage';
export const MEMBERSHIP_MANAGE = 'membership:manage';
export const USER_LIST = 'user:list';
export const USER_DELETE = 'user:delete';
export const NOTIFICATION_VIEW = 'notification:view';

export const ALL_PERMISSIONS = [
  REQUEST_VIEW, REQUEST_CREATE, REQUEST_UPDATE, REQUEST_DELETE, REQUEST_COMMENT,
  DEPARTMENT_MANAGE, MEMBERSHIP_MANAGE, USER_LIST, USER_DELETE, NOTIFICATION_VIEW
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];
export type Role = 'Host' | 'Admin' | 'Employee';

export const AUTHORIZATION_MATRIX = {
  [REQUEST_VIEW]: ['Host', 'Admin', 'Employee'],
  [REQUEST_CREATE]: ['Host', 'Admin', 'Employee'],
  [REQUEST_UPDATE]: ['Host', 'Admin'],
  [REQUEST_DELETE]: ['Host', 'Admin'],
  [REQUEST_COMMENT]: ['Host', 'Admin', 'Employee'],
  [DEPARTMENT_MANAGE]: ['Host', 'Admin'],
  [MEMBERSHIP_MANAGE]: ['Host', 'Admin'],
  [USER_LIST]: ['Host'],
  [USER_DELETE]: ['Host'],
  [NOTIFICATION_VIEW]: ['Host', 'Admin', 'Employee']
} as const satisfies Record<Permission, readonly Role[]>;

export function roleFor(user: ApplicationUser) {
  return user.isHost ? 'Host' : user.role === 'Admin' ? 'Admin' : 'Employee';
}

export function isAllowed(user: ApplicationUser, permission: Permission) {
  return (AUTHORIZATION_MATRIX[permission] as readonly Role[]).includes(roleFor(user));
}
