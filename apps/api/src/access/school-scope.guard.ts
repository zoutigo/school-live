import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from '@nestjs/common';
import { SchoolResolverService } from '../schools/school-resolver.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

@Injectable()
export class SchoolScopeGuard implements CanActivate {
  constructor(private readonly schoolResolver: SchoolResolverService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params: Record<string, string>;
      schoolId?: string;
    }>();

    const schoolSlug = req.params?.schoolSlug;

    if (!schoolSlug || !req.user) {
      return false;
    }

    const scopedSchoolId = await this.schoolResolver.resolveSchoolIdBySlug(schoolSlug);
    req.schoolId = scopedSchoolId;

    if (req.user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (req.user.schoolId !== scopedSchoolId) {
      throw new ForbiddenException('School scope mismatch');
    }

    return true;
  }
}
