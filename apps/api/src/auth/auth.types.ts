export type PlatformRole = "SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT";
export type SchoolRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "SCHOOL_STAFF"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";
export type AppRole = PlatformRole | SchoolRole;

export interface JwtPayload {
  sub: string;
}

export interface AuthenticatedUser {
  id: string;
  platformRoles: PlatformRole[];
  memberships: Array<{
    schoolId: string;
    role: SchoolRole;
  }>;
  profileCompleted: boolean;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  refreshExpiresIn: number;
  schoolSlug: string | null;
  csrfToken?: string;
}
