import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { isReadOnlySchoolMember } from "../common/school-member-status.util.js";
import { SchoolResolverService } from "../schools/school-resolver.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// /schools/:slug/auth/... et /schools/:slug/me/... : gestion de son propre compte.
const SELF_SERVICE_PATH = /^\/(?:api\/)?schools\/[^/]+\/(?:auth|me)(?:\/|\?|$)/;

@Injectable()
export class SchoolScopeGuard implements CanActivate {
  constructor(
    private readonly schoolResolver: SchoolResolverService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params: Record<string, string>;
      method?: string;
      url?: string;
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

    if ((req.user.activationStatus ?? "ACTIVE") !== "ACTIVE") {
      throw new ForbiddenException({
        code: "ACCOUNT_VALIDATION_REQUIRED",
        message: "School account is pending validation",
      });
    }

    await this.assertWritableMember(req.method, req.url, {
      schoolId: scopedSchoolId,
      userId: req.user.id,
      roles: req.schoolRoles,
    });

    return true;
  }

  /**
   * Un élève exclu (ou un parent dont tous les enfants sont exclus) garde un
   * accès en lecture seule : toute requête d'écriture est refusée, hormis la
   * gestion de son propre compte (`auth/*`, `me/*`).
   */
  private async assertWritableMember(
    method: string | undefined,
    url: string | undefined,
    input: { schoolId: string; userId: string; roles: string[] },
  ) {
    if (!this.prisma) return;
    const httpMethod = (method ?? "GET").toUpperCase();
    if (SAFE_METHODS.has(httpMethod)) return;
    if (SELF_SERVICE_PATH.test(url ?? "")) return;

    const readOnly = await isReadOnlySchoolMember(
      this.prisma,
      input.schoolId,
      input.userId,
      input.roles,
    );
    if (readOnly) {
      throw new ForbiddenException({
        code: "SCHOOL_MEMBER_READ_ONLY",
        message:
          "Votre accès à cet établissement est en lecture seule : vous ne pouvez plus effectuer cette action.",
      });
    }
  }
}
