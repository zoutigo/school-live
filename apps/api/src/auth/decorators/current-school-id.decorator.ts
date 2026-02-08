import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export const CurrentSchoolId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ schoolId: string }>();
    return req.schoolId;
  }
);
