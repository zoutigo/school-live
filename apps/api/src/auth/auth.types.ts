export type Role = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT' | 'STUDENT';

export interface JwtPayload {
  sub: string;
  schoolId: string;
  role: Role;
}

export interface AuthenticatedUser {
  id: string;
  schoolId: string;
  role: Role;
  email?: string | null;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
