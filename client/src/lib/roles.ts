// User role types
export type UserRole = 'admin' | 'area-manager' | 'user';

// Helper functions for role management
export const isAdmin = (role: UserRole | undefined): boolean => {
  return role === 'admin';
};

export const isAreaManager = (role: UserRole | undefined): boolean => {
  return role === 'area-manager';
};

export const hasManagerAccess = (role: UserRole | undefined): boolean => {
  return role === 'admin' || role === 'area-manager';
};