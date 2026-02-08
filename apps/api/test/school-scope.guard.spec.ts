import { ForbiddenException } from '@nestjs/common';
import { SchoolScopeGuard } from '../src/access/school-scope.guard';

describe('SchoolScopeGuard', () => {
  const schoolResolver = {
    resolveSchoolIdBySlug: jest.fn()
  };

  const guard = new SchoolScopeGuard(schoolResolver as never);

  function executionContext(user: { schoolId: string; role: string }, slug: string) {
    const request = {
      user,
      params: { schoolSlug: slug }
    } as Record<string, unknown>;

    return {
      switchToHttp: () => ({
        getRequest: () => request
      })
    } as never;
  }

  beforeEach(() => {
    schoolResolver.resolveSchoolIdBySlug.mockReset();
  });

  it('allows when schoolId matches', async () => {
    schoolResolver.resolveSchoolIdBySlug.mockResolvedValue('school-1');
    const allowed = await guard.canActivate(
      executionContext({ schoolId: 'school-1', role: 'SCHOOL_ADMIN' }, 'lycee-a')
    );

    expect(allowed).toBe(true);
  });

  it('denies when schoolId mismatches', async () => {
    schoolResolver.resolveSchoolIdBySlug.mockResolvedValue('school-2');

    await expect(
      guard.canActivate(executionContext({ schoolId: 'school-1', role: 'TEACHER' }, 'lycee-b'))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows super admin across schools', async () => {
    schoolResolver.resolveSchoolIdBySlug.mockResolvedValue('school-2');
    const allowed = await guard.canActivate(
      executionContext({ schoolId: 'school-1', role: 'SUPER_ADMIN' }, 'lycee-b')
    );

    expect(allowed).toBe(true);
  });
});
