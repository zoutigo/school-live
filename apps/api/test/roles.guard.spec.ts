import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../src/access/roles.guard";

describe("RolesGuard", () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);

  function executionContext(role?: string) {
    const user =
      role === undefined
        ? undefined
        : {
            id: "user-1",
            platformRoles:
              role === "SUPER_ADMIN" ||
              role === "ADMIN" ||
              role === "SALES" ||
              role === "SUPPORT"
                ? [role]
                : [],
            memberships:
              role === "SUPER_ADMIN" ||
              role === "ADMIN" ||
              role === "SALES" ||
              role === "SUPPORT"
                ? []
                : [{ schoolId: "school-1", role }],
            profileCompleted: true,
            firstName: "Test",
            lastName: "User",
          };

    return {
      getHandler: () => "handler",
      getClass: () => "class",
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          schoolRoles: role && !user?.platformRoles.length ? [role] : [],
        }),
      }),
    } as never;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows when no role metadata", () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    expect(guard.canActivate(executionContext("TEACHER"))).toBe(true);
  });

  it("allows when user role is included", () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      "TEACHER",
      "SCHOOL_ADMIN",
    ]);

    expect(guard.canActivate(executionContext("TEACHER"))).toBe(true);
  });

  it("denies when user role is not included", () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      "SCHOOL_ADMIN",
    ]);

    expect(guard.canActivate(executionContext("TEACHER"))).toBe(false);
  });
});
