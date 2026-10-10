import { ForbiddenException } from "@nestjs/common";
import { SchoolScopeGuard } from "../src/access/school-scope.guard";
import { isReadOnlySchoolMember } from "../src/common/school-member-status.util";

const SCHOOL_ID = "school-1";
const YEAR_ID = "year-1";

type Enrollment = { status: string };

function makePrisma(opts: {
  studentEnrollments?: Enrollment[] | null;
  childrenEnrollments?: Enrollment[][];
  activeSchoolYearId?: string | null;
}) {
  return {
    school: {
      findUnique: jest.fn().mockResolvedValue({
        activeSchoolYearId:
          opts.activeSchoolYearId === undefined
            ? YEAR_ID
            : opts.activeSchoolYearId,
      }),
    },
    student: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          opts.studentEnrollments
            ? { enrollments: opts.studentEnrollments }
            : null,
        ),
    },
    parentStudent: {
      findMany: jest.fn().mockResolvedValue(
        (opts.childrenEnrollments ?? []).map((enrollments) => ({
          student: { enrollments },
        })),
      ),
    },
  };
}

describe("isReadOnlySchoolMember", () => {
  const check = (
    prisma: ReturnType<typeof makePrisma>,
    roles: string[],
  ): Promise<boolean> =>
    isReadOnlySchoolMember(prisma as never, SCHOOL_ID, "user-1", roles);

  it("élève exclu (WITHDRAWN) : lecture seule", async () => {
    const prisma = makePrisma({
      studentEnrollments: [{ status: "WITHDRAWN" }],
    });
    await expect(check(prisma, ["STUDENT"])).resolves.toBe(true);
  });

  it("élève actif, sans inscription ou sans profil : écriture normale", async () => {
    await expect(
      check(makePrisma({ studentEnrollments: [{ status: "ACTIVE" }] }), [
        "STUDENT",
      ]),
    ).resolves.toBe(false);
    await expect(
      check(makePrisma({ studentEnrollments: [] }), ["STUDENT"]),
    ).resolves.toBe(false);
    await expect(check(makePrisma({}), ["STUDENT"])).resolves.toBe(false);
  });

  it("parent dont TOUS les enfants sont exclus : lecture seule", async () => {
    const prisma = makePrisma({
      childrenEnrollments: [
        [{ status: "WITHDRAWN" }],
        [{ status: "WITHDRAWN" }],
      ],
    });
    await expect(check(prisma, ["PARENT"])).resolves.toBe(true);
  });

  it("parent avec au moins un enfant actif : garde l'écriture", async () => {
    const prisma = makePrisma({
      childrenEnrollments: [[{ status: "WITHDRAWN" }], [{ status: "ACTIVE" }]],
    });
    await expect(check(prisma, ["PARENT"])).resolves.toBe(false);
  });

  it("parent sans enfant lié ou enfant sans inscription : écriture normale", async () => {
    await expect(check(makePrisma({}), ["PARENT"])).resolves.toBe(false);
    await expect(
      check(makePrisma({ childrenEnrollments: [[]] }), ["PARENT"]),
    ).resolves.toBe(false);
  });

  it("compte élève + parent : lecture seule uniquement si les DEUX rôles sont exclus", async () => {
    const bothExcluded = makePrisma({
      studentEnrollments: [{ status: "WITHDRAWN" }],
      childrenEnrollments: [[{ status: "WITHDRAWN" }]],
    });
    await expect(check(bothExcluded, ["STUDENT", "PARENT"])).resolves.toBe(
      true,
    );

    const studentExcludedParentActive = makePrisma({
      studentEnrollments: [{ status: "WITHDRAWN" }],
      childrenEnrollments: [[{ status: "ACTIVE" }]],
    });
    await expect(
      check(studentExcludedParentActive, ["STUDENT", "PARENT"]),
    ).resolves.toBe(false);

    const studentActiveParentExcluded = makePrisma({
      studentEnrollments: [{ status: "ACTIVE" }],
      childrenEnrollments: [[{ status: "WITHDRAWN" }]],
    });
    await expect(
      check(studentActiveParentExcluded, ["STUDENT", "PARENT"]),
    ).resolves.toBe(false);
  });

  it("jamais pour un rôle de gestion, même cumulé avec STUDENT/PARENT", async () => {
    const prisma = makePrisma({
      studentEnrollments: [{ status: "WITHDRAWN" }],
    });
    await expect(check(prisma, ["TEACHER"])).resolves.toBe(false);
    await expect(check(prisma, ["STUDENT", "TEACHER"])).resolves.toBe(false);
    expect(prisma.student.findFirst).not.toHaveBeenCalled();
    await expect(check(prisma, [])).resolves.toBe(false);
  });

  it("sans année scolaire active : pas de lecture seule", async () => {
    const prisma = makePrisma({
      studentEnrollments: [{ status: "WITHDRAWN" }],
      activeSchoolYearId: null,
    });
    await expect(check(prisma, ["STUDENT"])).resolves.toBe(false);
  });

  it("restreint toutes les requêtes à l'année active et à l'école", async () => {
    const prisma = makePrisma({
      studentEnrollments: [{ status: "WITHDRAWN" }],
    });
    await check(prisma, ["STUDENT"]);
    expect(prisma.student.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: SCHOOL_ID, userId: "user-1" },
        select: {
          enrollments: {
            where: { schoolId: SCHOOL_ID, schoolYearId: YEAR_ID },
            select: { status: true },
          },
        },
      }),
    );
  });
});

describe("SchoolScopeGuard — accès en lecture seule", () => {
  const resolver = { resolveSchoolIdBySlug: jest.fn() };

  function context(
    role: string,
    method: string,
    url: string,
    platformRoles: string[] = [],
  ) {
    const request = {
      user: {
        id: "user-1",
        platformRoles,
        memberships: platformRoles.length
          ? []
          : [{ schoolId: SCHOOL_ID, role }],
        profileCompleted: true,
        firstName: "T",
        lastName: "U",
      },
      params: { schoolSlug: "ecole" },
      method,
      url,
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as never;
  }

  const excludedStudentPrisma = () =>
    makePrisma({ studentEnrollments: [{ status: "WITHDRAWN" }] });

  beforeEach(() => {
    resolver.resolveSchoolIdBySlug.mockReset();
    resolver.resolveSchoolIdBySlug.mockResolvedValue(SCHOOL_ID);
  });

  it("refuse les écritures d'un élève exclu avec le code SCHOOL_MEMBER_READ_ONLY", async () => {
    const guard = new SchoolScopeGuard(
      resolver as never,
      excludedStudentPrisma() as never,
    );
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const error = await guard
        .canActivate(
          context("STUDENT", method, "/api/schools/ecole/messaging/messages"),
        )
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual(
        expect.objectContaining({ code: "SCHOOL_MEMBER_READ_ONLY" }),
      );
    }
  });

  it("laisse passer toutes les lectures (GET/HEAD/OPTIONS) sans requête en base", async () => {
    const prisma = excludedStudentPrisma();
    const guard = new SchoolScopeGuard(resolver as never, prisma as never);
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      await expect(
        guard.canActivate(
          context("STUDENT", method, "/api/schools/ecole/homework"),
        ),
      ).resolves.toBe(true);
    }
    expect(prisma.student.findFirst).not.toHaveBeenCalled();
  });

  it("laisse un élève exclu gérer son compte (auth/*, me/*) mais rien d'autre", async () => {
    const guard = new SchoolScopeGuard(
      resolver as never,
      excludedStudentPrisma() as never,
    );
    for (const url of [
      "/api/schools/ecole/auth/logout",
      "/api/schools/ecole/me/push-tokens",
      "/schools/ecole/auth/change-password?x=1",
    ]) {
      await expect(
        guard.canActivate(context("STUDENT", "POST", url)),
      ).resolves.toBe(true);
    }
    // Un chemin qui ressemble à /me mais n'en est pas un reste bloqué.
    await expect(
      guard.canActivate(
        context("STUDENT", "POST", "/api/schools/ecole/messaging/me-too"),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(
        context("STUDENT", "POST", "/api/schools/ecole/homework?next=/me/x"),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("n'affecte ni un élève actif, ni un enseignant, ni un admin plateforme", async () => {
    const active = new SchoolScopeGuard(
      resolver as never,
      makePrisma({ studentEnrollments: [{ status: "ACTIVE" }] }) as never,
    );
    await expect(
      active.canActivate(context("STUDENT", "POST", "/api/schools/ecole/x")),
    ).resolves.toBe(true);

    const prisma = excludedStudentPrisma();
    const guard = new SchoolScopeGuard(resolver as never, prisma as never);
    await expect(
      guard.canActivate(context("TEACHER", "POST", "/api/schools/ecole/x")),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(
        context("SUPER_ADMIN", "POST", "/api/schools/ecole/x", ["SUPER_ADMIN"]),
      ),
    ).resolves.toBe(true);
    expect(prisma.student.findFirst).not.toHaveBeenCalled();
  });

  it("sans PrismaService injecté, le garde reste compatible (pas de contrôle)", async () => {
    const guard = new SchoolScopeGuard(resolver as never);
    await expect(
      guard.canActivate(context("STUDENT", "POST", "/api/schools/ecole/x")),
    ).resolves.toBe(true);
  });
});
