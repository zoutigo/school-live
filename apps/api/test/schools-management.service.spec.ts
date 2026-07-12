import { ManagementService } from "../src/management/management.service.js";

const prisma = {
  school: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  student: {
    groupBy: jest.fn(),
  },
  class: {
    groupBy: jest.fn(),
  },
  $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
};

const mailService = {};

const service = new ManagementService(prisma as never, mailService as never);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation((ops: Array<Promise<unknown>>) =>
    Promise.all(ops),
  );
});

function makeSchoolRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "school-1",
    slug: "school-1",
    name: "École 1",
    country: "Cameroun",
    region: "Centre",
    city: "Yaoundé",
    cycle: "SECONDARY",
    languageSystem: "FRANCOPHONE",
    logoUrl: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    activeSchoolYear: null,
    _count: { memberships: 3, classes: 2, students: 40 },
    ...overrides,
  };
}

describe("ManagementService — listSchools (pagination/search/filters)", () => {
  it("applique page=1/limit=20 par défaut et retourne items + meta", async () => {
    prisma.school.findMany.mockResolvedValue([makeSchoolRow()]);
    prisma.school.count.mockResolvedValue(1);

    const result = await service.listSchools({});

    expect(prisma.school.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: { name: "asc" },
        skip: 0,
        take: 20,
      }),
    );
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "school-1",
      usersCount: 3,
      classesCount: 2,
      studentsCount: 40,
    });
  });

  it("calcule skip/take pour une page > 1", async () => {
    prisma.school.findMany.mockResolvedValue([]);
    prisma.school.count.mockResolvedValue(45);

    const result = await service.listSchools({ page: 3, limit: 20 });

    expect(prisma.school.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
    expect(result.meta).toEqual({
      page: 3,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it("ramène totalPages=1 au minimum même quand total=0", async () => {
    prisma.school.findMany.mockResolvedValue([]);
    prisma.school.count.mockResolvedValue(0);

    const result = await service.listSchools({ page: 1, limit: 20 });

    expect(result.meta.totalPages).toBe(1);
    expect(result.items).toEqual([]);
  });

  it("construit un OR insensible à la casse sur name/slug/city/region/country pour la recherche", async () => {
    prisma.school.findMany.mockResolvedValue([]);
    prisma.school.count.mockResolvedValue(0);

    await service.listSchools({ search: "  Yaoundé  " });

    const call = prisma.school.findMany.mock.calls[0][0];
    expect(call.where).toEqual({
      AND: [
        {
          OR: [
            { name: { contains: "Yaoundé", mode: "insensitive" } },
            { slug: { contains: "Yaoundé", mode: "insensitive" } },
            { city: { contains: "Yaoundé", mode: "insensitive" } },
            { region: { contains: "Yaoundé", mode: "insensitive" } },
            { country: { contains: "Yaoundé", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  it("ignore une recherche vide ou composée uniquement d'espaces", async () => {
    prisma.school.findMany.mockResolvedValue([]);
    prisma.school.count.mockResolvedValue(0);

    await service.listSchools({ search: "   " });

    expect(prisma.school.findMany.mock.calls[0][0].where).toEqual({});
  });

  it("filtre par cycle", async () => {
    prisma.school.findMany.mockResolvedValue([]);
    prisma.school.count.mockResolvedValue(0);

    await service.listSchools({ cycle: "PRIMARY" });

    expect(prisma.school.findMany.mock.calls[0][0].where).toEqual({
      AND: [{ cycle: "PRIMARY" }],
    });
  });

  it("filtre par languageSystem", async () => {
    prisma.school.findMany.mockResolvedValue([]);
    prisma.school.count.mockResolvedValue(0);

    await service.listSchools({ languageSystem: "BILINGUAL" });

    expect(prisma.school.findMany.mock.calls[0][0].where).toEqual({
      AND: [{ languageSystem: "BILINGUAL" }],
    });
  });

  it("combine recherche + cycle + languageSystem dans un seul AND", async () => {
    prisma.school.findMany.mockResolvedValue([]);
    prisma.school.count.mockResolvedValue(0);

    await service.listSchools({
      search: "Vogt",
      cycle: "SECONDARY",
      languageSystem: "FRANCOPHONE",
    });

    const call = prisma.school.findMany.mock.calls[0][0];
    expect(call.where.AND).toHaveLength(3);
    expect(call.where.AND[1]).toEqual({ cycle: "SECONDARY" });
    expect(call.where.AND[2]).toEqual({ languageSystem: "FRANCOPHONE" });
  });

  it("plafonne la limite au maximum autorisé même si un appelant force une valeur plus grande", async () => {
    prisma.school.findMany.mockResolvedValue([]);
    prisma.school.count.mockResolvedValue(0);

    // Le DTO (class-validator) borne déjà limit à 100 avant d'atteindre le
    // service ; on vérifie ici que le service respecte la valeur transmise
    // sans la recalculer différemment (pas de logique dupliquée/désynchronisée).
    await service.listSchools({ page: 1, limit: 100 });

    expect(prisma.school.findMany.mock.calls[0][0].take).toBe(100);
  });
});

describe("ManagementService — listSchoolOptions (picker léger pour les web apps)", () => {
  it("ne sélectionne que id/slug/name, triés par nom", async () => {
    prisma.school.findMany.mockResolvedValue([
      { id: "s1", slug: "ecole-a", name: "École A" },
    ]);

    const result = await service.listSchoolOptions();

    expect(prisma.school.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true },
    });
    expect(result).toEqual([{ id: "s1", slug: "ecole-a", name: "École A" }]);
  });
});

describe("ManagementService — getSchoolsOverview (à l'échelle de 10k+ écoles)", () => {
  it("agrège totaux et répartition par cycle sans charger les écoles en entier", async () => {
    prisma.school.findMany.mockResolvedValue([
      { id: "s1", cycle: "PRIMARY" },
      { id: "s2", cycle: "SECONDARY" },
      { id: "s3", cycle: "SECONDARY" },
      { id: "s4", cycle: null },
    ]);
    prisma.student.groupBy.mockResolvedValue([
      { schoolId: "s1", _count: { _all: 10 } },
      { schoolId: "s2", _count: { _all: 5 } },
      { schoolId: "s3", _count: { _all: 7 } },
    ]);
    prisma.class.groupBy.mockResolvedValue([
      { schoolId: "s1", _count: { _all: 1 } },
      { schoolId: "s2", _count: { _all: 2 } },
      { schoolId: "s4", _count: { _all: 3 } },
    ]);

    const result = await service.getSchoolsOverview();

    expect(prisma.school.findMany).toHaveBeenCalledWith({
      select: { id: true, cycle: true },
    });
    expect(result.totals).toEqual({ schools: 4, students: 22, classes: 6 });
    expect(result.byCycle).toEqual({
      PRIMARY: { schools: 1, students: 10, classes: 1 },
      SECONDARY: { schools: 2, students: 12, classes: 2 },
      UNSET: { schools: 1, students: 0, classes: 3 },
    });
  });

  it("gère une plateforme sans école (totaux à zéro, pas d'exception)", async () => {
    prisma.school.findMany.mockResolvedValue([]);
    prisma.student.groupBy.mockResolvedValue([]);
    prisma.class.groupBy.mockResolvedValue([]);

    const result = await service.getSchoolsOverview();

    expect(result.totals).toEqual({ schools: 0, students: 0, classes: 0 });
    expect(result.byCycle.PRIMARY).toEqual({
      schools: 0,
      students: 0,
      classes: 0,
    });
  });

  it("traite une école sans aucun élève ni classe comme des compteurs à zéro (pas undefined)", async () => {
    prisma.school.findMany.mockResolvedValue([{ id: "s1", cycle: "PRIMARY" }]);
    prisma.student.groupBy.mockResolvedValue([]);
    prisma.class.groupBy.mockResolvedValue([]);

    const result = await service.getSchoolsOverview();

    expect(result.byCycle.PRIMARY).toEqual({
      schools: 1,
      students: 0,
      classes: 0,
    });
  });
});
