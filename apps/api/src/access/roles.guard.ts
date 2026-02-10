import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AppRole, AuthenticatedUser } from '../auth/auth.types.js';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      schoolRoles?: AppRole[];
    }>();
    const user = req.user;

    if (!user) {
      return false;
    }

    const userRoles = new Set<AppRole>([...user.platformRoles, ...(req.schoolRoles ?? [])]);
    return requiredRoles.some((role) => userRoles.has(role));
  }
}
