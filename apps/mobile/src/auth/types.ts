export type Role = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT' | 'STUDENT';

export type AuthUser = {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  role: Role;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};
