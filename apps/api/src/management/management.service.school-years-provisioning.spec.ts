/**
 * Tests unitaires : ManagementService.createSchoolYear / rolloverSchoolYear
 * - provisioning automatique de l'echeancier (FeeSchedule) par niveau des
 *   qu'une nouvelle annee scolaire est creee, quel que soit le chemin
 *   (creation manuelle par le chef d'etablissement ou roulement explicite)
 */
import { ManagementService } from "./management.service.js";
import type { EnrollmentsService } from "../enrollments/enrollments.service.js";
import type { MailService } from "../mail/mail.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const SCHOOL_ID = "school-1";
const ACTIVE_YEAR_ID = "year-active";

function makeService() {
  const prisma: any = {
    school: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ activeSchoolYearId: ACTIVE_YEAR_ID }),
    },
    schoolYear: {
      findFirst: jest.fn().mockResolvedValue({ id: ACTIVE_YEAR_ID }),
      create: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ id: "new-year", ...data }),
        ),
      upsert: jest
        .fn()
        .mockImplementation(({ create }) =>
          Promise.resolve({ id: "target-year", ...create }),
        ),
    },
    class: { findMany: jest.fn().mockResolvedValue([]) },
    teacherClassSubject: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    enrollment: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn(async (arg: any) =>
      typeof arg === "function" ? arg(prisma) : Promise.all(arg),
    ),
  };
  const enrollmentsService = {
    provisionFeeSchedulesForNewYear: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ManagementService(
    prisma as unknown as PrismaService,
    {} as unknown as MailService,
    undefined,
    undefined,
    enrollmentsService as unknown as EnrollmentsService,
  );
  return { service, prisma, enrollmentsService };
}

describe("ManagementService — provisioning des echeanciers a la creation d'annee", () => {
  it("createSchoolYear provisionne depuis l'annee active courante", async () => {
    const { service, enrollmentsService } = makeService();

    const created = await service.createSchoolYear(SCHOOL_ID, {
      label: "2027-2028",
    });

    expect(
      enrollmentsService.provisionFeeSchedulesForNewYear,
    ).toHaveBeenCalledWith(SCHOOL_ID, ACTIVE_YEAR_ID, created.id);
  });

  it("createSchoolYear ne provisionne rien si l'ecole n'a pas encore d'annee active", async () => {
    const { service, prisma, enrollmentsService } = makeService();
    prisma.school.findUnique.mockResolvedValue({ activeSchoolYearId: null });

    await service.createSchoolYear(SCHOOL_ID, { label: "2027-2028" });

    expect(
      enrollmentsService.provisionFeeSchedulesForNewYear,
    ).not.toHaveBeenCalled();
  });

  it("rolloverSchoolYear provisionne depuis l'annee source vers l'annee cible", async () => {
    const { service, enrollmentsService } = makeService();

    await service.rolloverSchoolYear(SCHOOL_ID, {
      sourceSchoolYearId: ACTIVE_YEAR_ID,
      targetLabel: "2027-2028",
    });

    expect(
      enrollmentsService.provisionFeeSchedulesForNewYear,
    ).toHaveBeenCalledWith(SCHOOL_ID, ACTIVE_YEAR_ID, "target-year");
  });
});
