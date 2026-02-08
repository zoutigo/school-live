import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/access/roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn()
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);

  function executionContext(role?: string) {
    return {
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) })
    } as never;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows when no role metadata', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    expect(guard.canActivate(executionContext('TEACHER'))).toBe(true);
  });

  it('allows when user role is included', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['TEACHER', 'SCHOOL_ADMIN']);

    expect(guard.canActivate(executionContext('TEACHER'))).toBe(true);
  });

  it('denies when user role is not included', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['SCHOOL_ADMIN']);

    expect(guard.canActivate(executionContext('TEACHER'))).toBe(false);
  });
});
