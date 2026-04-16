// User role types
export type UserRole = 'superadmin' | 'admin' | 'area-manager' | 'user' | 'api-user';

export const isSuperAdmin = (role: UserRole | undefined): boolean => {
  return role === 'superadmin';
};

export const isAdmin = (role: UserRole | undefined): boolean => {
  return role === 'admin' || role === 'superadmin';
};

export const isAreaManager = (role: UserRole | undefined): boolean => {
  return role === 'area-manager';
};

export const isApiUser = (role: UserRole | undefined): boolean => {
  return role === 'api-user';
};

export const hasManagerAccess = (role: UserRole | undefined): boolean => {
  return role === 'admin' || role === 'area-manager' || role === 'superadmin';
};
