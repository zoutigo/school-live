/**
 * Tests unitaires : SupplyListAvailableNotificationsProjectionService
 * - ne notifie que les parents actifs, jamais l'eleve (badge/notif parent uniquement)
 * - n'envoie rien si l'eleve ou l'annee scolaire sont introuvables
 * - n'appelle pas le push si aucun token n'est trouve
 */

import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { PushService } from "./push.service.js";
import { SupplyListAvailableNotificationsProjectionService } from "./supply-list-available-notifications-projection.service.js";

const SCHOOL_ID = "school-1";
const STUDENT_ID = "student-1";
const SCHOOL_YEAR_ID = "year-2026";

const makePrismaMock = () => ({
  student: {
    findFirst: jest.fn().mockResolvedValue({
      firstName: "Remi",
      lastName: "Ntamack",
      school: { slug: "ecole-pilote" },
      parentLinks: [
        {
          parent: { id: "parent-active", activationStatus: "ACTIVE" },
        },
        {
          parent: { id: "parent-inactive", activationStatus: "PENDING" },
        },
      ],
    }),
  },
  schoolYear: {
    findUnique: jest.fn().mockResolvedValue({ label: "2026-2027" }),
  },
  mobilePushToken: {
    findMany: jest.fn().mockResolvedValue([{ token: "ExpoPushToken[abc]" }]),
  },
});

describe("SupplyListAvailableNotificationsProjectionService", () => {
  let service: SupplyListAvailableNotificationsProjectionService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let pushService: { sendSupplyListAvailableNotification: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    pushService = { sendSupplyListAvailableNotification: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        SupplyListAvailableNotificationsProjectionService,
        { provide: PrismaService, useValue: prisma },
        { provide: PushService, useValue: pushService },
      ],
    }).compile();
    service = module.get(SupplyListAvailableNotificationsProjectionService);
  });

  it("ne fait rien si l'eleve est introuvable", async () => {
    prisma.student.findFirst.mockResolvedValue(null);
    await service.project({
      schoolId: SCHOOL_ID,
      studentId: STUDENT_ID,
      schoolYearId: SCHOOL_YEAR_ID,
    });
    expect(pushService.sendSupplyListAvailableNotification).not.toHaveBeenCalled();
  });

  it("ne fait rien si l'annee scolaire est introuvable", async () => {
    prisma.schoolYear.findUnique.mockResolvedValue(null);
    await service.project({
      schoolId: SCHOOL_ID,
      studentId: STUDENT_ID,
      schoolYearId: SCHOOL_YEAR_ID,
    });
    expect(pushService.sendSupplyListAvailableNotification).not.toHaveBeenCalled();
  });

  it("ne notifie que les parents actifs, jamais l'eleve", async () => {
    await service.project({
      schoolId: SCHOOL_ID,
      studentId: STUDENT_ID,
      schoolYearId: SCHOOL_YEAR_ID,
    });
    expect(prisma.mobilePushToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: ["parent-active"] },
        }),
      }),
    );
    expect(pushService.sendSupplyListAvailableNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ["ExpoPushToken[abc]"],
        body: expect.stringContaining("Remi Ntamack"),
        data: {
          type: "SUPPLY_LIST_AVAILABLE",
          schoolSlug: "ecole-pilote",
          studentId: STUDENT_ID,
          schoolYearId: SCHOOL_YEAR_ID,
        },
      }),
    );
  });

  it("ne notifie personne si aucun parent actif n'est rattache a l'eleve", async () => {
    prisma.student.findFirst.mockResolvedValue({
      firstName: "Remi",
      lastName: "Ntamack",
      school: { slug: "ecole-pilote" },
      parentLinks: [
        { parent: { id: "parent-inactive", activationStatus: "PENDING" } },
      ],
    });
    await service.project({
      schoolId: SCHOOL_ID,
      studentId: STUDENT_ID,
      schoolYearId: SCHOOL_YEAR_ID,
    });
    expect(prisma.mobilePushToken.findMany).not.toHaveBeenCalled();
    expect(pushService.sendSupplyListAvailableNotification).not.toHaveBeenCalled();
  });
});
