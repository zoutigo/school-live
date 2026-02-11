import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { SchoolResolverService } from "../schools/school-resolver.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";

@Injectable()
export class SchoolScopeGuard implements CanActivate {
  constructor(private readonly schoolResolver: SchoolResolverService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params: Record<string, string>;
      schoolId?: string;
      schoolRoles?: AuthenticatedUser["memberships"][number]["role"][];
    }>();

    const schoolSlug = req.params?.schoolSlug;

    if (!schoolSlug || !req.user) {
      return false;
    }

    const scopedSchoolId =
      await this.schoolResolver.resolveSchoolIdBySlug(schoolSlug);
    req.schoolId = scopedSchoolId;
    req.schoolRoles = req.user.memberships
      .filter((membership) => membership.schoolId === scopedSchoolId)
      .map((membership) => membership.role);

    if (
      req.user.platformRoles.includes("SUPER_ADMIN") ||
      req.user.platformRoles.includes("ADMIN")
    ) {
      return true;
    }

    if (!req.schoolRoles.length) {
      throw new ForbiddenException("User is not bound to a school");
    }

    return true;
  }
}
