import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateResourceDto } from "./dto/create-resource.dto.js";
import { ResourcesService } from "./resources.service.js";

const SCHOOL_ID = "school-1";
const TEACHER_ID = "teacher-1";
const OTHER_TEACHER_ID = "teacher-2";
const ADMIN_ID = "admin-1";
const LEVEL_ID = "level-national-1";
const SUBJECT_ID = "subject-national-1";
const RESOURCE_ID = "resource-1";

function makeTeacher(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: TEACHER_ID,
    firstName: "Paul",
    lastName: "Martin",
    profileCompleted: true,
    platformRoles: [],
    memberships: [{ schoolId: SCHOOL_ID, role: "TEACHER" }],
    activeRole: "TEACHER",
    preferredLocale: "FR",
    ...overrides,
  };
}

function makePlatformAdmin(): AuthenticatedUser {
  return {
    id: ADMIN_ID,
    firstName: "Ada",
    lastName: "Admin",
    profileCompleted: true,
    platformRoles: ["ADMIN"],
    memberships: [],
    activeRole: "ADMIN",
    preferredLocale: "FR",
  };
}

function makeCreatePayload(
  overrides: Partial<CreateResourceDto> = {},
): CreateResourceDto {
  return {
    kind: "ASSESSMENT",
    schoolId: SCHOOL_ID,
    academicLevelId: LEVEL_ID,
    subjectId: SUBJECT_ID,
    examType: "SEQUENCE_TEST",
    sequence: "SEQ_1",
    academicYearLabel: "2025-2026",
    title: "Controle chapitre 3",
    statementContent: "<p>Enonce</p>",
    ...overrides,
  };
}

function makeResourceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: RESOURCE_ID,
    kind: "ASSESSMENT",
    schoolId: SCHOOL_ID,
    academicLevelId: LEVEL_ID,
    subjectId: SUBJECT_ID,
    examType: "SEQUENCE_TEST",
    sequence: "SEQ_1",
    academicYearLabel: "2025-2026",
    title: "Controle chapitre 3",
    authorUserId: TEACHER_ID,
    statementContent: "<p>Enonce</p>",
    statementStatus: "PENDING",
    correctionContent: null,
    correctionStatus: "PENDING",
    createdAt: new Date("2026-07-01T10:00:00Z"),
    updatedAt: new Date("2026-07-01T10:00:00Z"),
    school: { id: SCHOOL_ID, name: "Ecole Test" },
    academicLevel: { id: LEVEL_ID, code: "6EME", label: "6eme" },
    subject: { id: SUBJECT_ID, name: "Mathematiques" },
    authorUser: { id: TEACHER_ID, firstName: "Paul", lastName: "Martin" },
    attachments: [],
    ...overrides,
  };
}

function makePrismaMock() {
  return {
    academicLevel: { findUnique: jest.fn() },
    subject: { findUnique: jest.fn() },
    resource: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    resourceAttachment: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    resourceFavorite: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    school: {
      findMany: jest.fn(),
    },
  };
}

function makeInlineMediaMock() {
  return {
    syncEntityImages: jest.fn().mockResolvedValue(undefined),
    registerTempUpload: jest.fn().mockResolvedValue(undefined),
  };
}

describe("ResourcesService", () => {
  let service: ResourcesService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let inlineMedia: ReturnType<typeof makeInlineMediaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    inlineMedia = makeInlineMediaMock();

    prisma.academicLevel.findUnique.mockResolvedValue({ schoolId: null });
    prisma.subject.findUnique.mockResolvedValue({ schoolId: null });

    const module = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: prisma },
        { provide: InlineMediaService, useValue: inlineMedia },
      ],
    }).compile();

    service = module.get(ResourcesService);
  });

  describe("createResource", () => {
    it("rejects an ASSESSMENT without schoolId", async () => {
      await expect(
        service.createResource(
          makeTeacher(),
          makeCreatePayload({ schoolId: undefined }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects an ASSESSMENT without sequence", async () => {
      await expect(
        service.createResource(
          makeTeacher(),
          makeCreatePayload({ sequence: undefined }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects an EXAM that carries a schoolId", async () => {
      await expect(
        service.createResource(
          makeTeacher(),
          makeCreatePayload({
            kind: "EXAM",
            schoolId: SCHOOL_ID,
            sequence: undefined,
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects an EXAM that carries a sequence", async () => {
      await expect(
        service.createResource(
          makeTeacher(),
          makeCreatePayload({
            kind: "EXAM",
            schoolId: undefined,
            sequence: "SEQ_1",
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects an academicLevel that is not part of the national catalog", async () => {
      prisma.academicLevel.findUnique.mockResolvedValue({
        schoolId: SCHOOL_ID,
      });
      await expect(
        service.createResource(makeTeacher(), makeCreatePayload()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects a subject that is not part of the national catalog", async () => {
      prisma.subject.findUnique.mockResolvedValue({ schoolId: SCHOOL_ID });
      await expect(
        service.createResource(makeTeacher(), makeCreatePayload()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("creates a valid ASSESSMENT resource with a SUBMIT audit log entry", async () => {
      prisma.resource.create.mockResolvedValue({
        id: RESOURCE_ID,
        schoolId: SCHOOL_ID,
      });
      prisma.resource.findUnique.mockResolvedValue(makeResourceRow());
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await service.createResource(makeTeacher(), makeCreatePayload());

      expect(prisma.resource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kind: "ASSESSMENT",
            schoolId: SCHOOL_ID,
            sequence: "SEQ_1",
            authorUserId: TEACHER_ID,
            auditLogs: {
              create: { actorUserId: TEACHER_ID, action: "SUBMIT" },
            },
          }),
        }),
      );
      expect(inlineMedia.syncEntityImages).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: `${RESOURCE_ID}:statement` }),
      );
    });

    it("creates a valid EXAM resource with schoolId=null", async () => {
      prisma.resource.create.mockResolvedValue({
        id: RESOURCE_ID,
        schoolId: null,
      });
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({ kind: "EXAM", schoolId: null, sequence: null }),
      );
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await service.createResource(
        makeTeacher(),
        makeCreatePayload({
          kind: "EXAM",
          schoolId: undefined,
          sequence: undefined,
        }),
      );

      expect(prisma.resource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ schoolId: null, sequence: null }),
        }),
      );
    });
  });

  describe("updateResource", () => {
    it("throws NotFoundException if the resource does not exist", async () => {
      prisma.resource.findUnique.mockResolvedValue(null);
      await expect(
        service.updateResource(makeTeacher(), RESOURCE_ID, { title: "x" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("forbids a non-author from editing", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({ authorUserId: OTHER_TEACHER_ID }),
      );
      await expect(
        service.updateResource(makeTeacher(), RESOURCE_ID, { title: "x" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("resets an APPROVED statement back to PENDING when its content changes", async () => {
      prisma.resource.findUnique
        .mockResolvedValueOnce(
          makeResourceRow({
            statementStatus: "APPROVED",
            statementContent: "<p>old</p>",
          }),
        )
        .mockResolvedValueOnce(makeResourceRow());
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await service.updateResource(makeTeacher(), RESOURCE_ID, {
        statementContent: "<p>new</p>",
      });

      expect(prisma.resource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statementContent: "<p>new</p>",
            statementStatus: "PENDING",
            statementApprovedByUserId: null,
            statementApprovedAt: null,
          }),
        }),
      );
    });

    it("does not touch statementStatus when the content is unchanged", async () => {
      prisma.resource.findUnique
        .mockResolvedValueOnce(
          makeResourceRow({
            statementStatus: "APPROVED",
            statementContent: "<p>same</p>",
          }),
        )
        .mockResolvedValueOnce(makeResourceRow());
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await service.updateResource(makeTeacher(), RESOURCE_ID, {
        statementContent: "<p>same</p>",
      });

      const call = prisma.resource.update.mock.calls[0][0];
      expect(call.data.statementStatus).toBeUndefined();
    });

    it("allows updating level/subject/examType/sequence/academicYearLabel, re-validating national references", async () => {
      prisma.resource.findUnique
        .mockResolvedValueOnce(makeResourceRow())
        .mockResolvedValueOnce(makeResourceRow());
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await service.updateResource(makeTeacher(), RESOURCE_ID, {
        academicLevelId: "level-national-2",
        subjectId: "subject-national-2",
        examType: "MOCK_EXAM",
        sequence: "SEQ_3",
        academicYearLabel: "2026-2027",
      });

      expect(prisma.academicLevel.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "level-national-2" } }),
      );
      expect(prisma.subject.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "subject-national-2" } }),
      );
      expect(prisma.resource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            academicLevelId: "level-national-2",
            subjectId: "subject-national-2",
            examType: "MOCK_EXAM",
            sequence: "SEQ_3",
            academicYearLabel: "2026-2027",
          }),
        }),
      );
    });

    it("ignores schoolId/sequence updates for an EXAM resource", async () => {
      prisma.resource.findUnique
        .mockResolvedValueOnce(
          makeResourceRow({ kind: "EXAM", schoolId: null, sequence: null }),
        )
        .mockResolvedValueOnce(makeResourceRow());
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await service.updateResource(makeTeacher(), RESOURCE_ID, {
        schoolId: SCHOOL_ID,
        sequence: "SEQ_2",
      });

      const call = prisma.resource.update.mock.calls[0][0];
      expect(call.data.schoolId).toBeUndefined();
      expect(call.data.sequence).toBeUndefined();
    });

    it("resets an APPROVED correction back to PENDING independently of the statement", async () => {
      prisma.resource.findUnique
        .mockResolvedValueOnce(
          makeResourceRow({
            statementStatus: "APPROVED",
            correctionStatus: "APPROVED",
            correctionContent: "<p>old correction</p>",
          }),
        )
        .mockResolvedValueOnce(makeResourceRow());
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await service.updateResource(makeTeacher(), RESOURCE_ID, {
        correctionContent: "<p>new correction</p>",
      });

      const call = prisma.resource.update.mock.calls[0][0];
      expect(call.data.correctionStatus).toBe("PENDING");
      expect(call.data.statementStatus).toBeUndefined();
    });
  });

  describe("getResource — correction visibility", () => {
    it("masks the correction content when correctionStatus is not APPROVED, for a non-author reader", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({
          authorUserId: OTHER_TEACHER_ID,
          statementStatus: "APPROVED",
          correctionStatus: "PENDING",
          correctionContent: "<p>secret correction</p>",
          statementContent: "<p>enonce</p>",
          attachments: [{ id: "a1", part: "CORRECTION", fileName: "c.pdf" }],
        }),
      );
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      const result = await service.getResource(makeTeacher(), RESOURCE_ID);

      expect(result.correctionContent).toBeNull();
      expect(result.attachments).toHaveLength(0);
    });

    it("shows the correction content once correctionStatus is APPROVED", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({
          authorUserId: OTHER_TEACHER_ID,
          statementStatus: "APPROVED",
          correctionStatus: "APPROVED",
          correctionContent: "<p>visible correction</p>",
          attachments: [{ id: "a1", part: "CORRECTION", fileName: "c.pdf" }],
        }),
      );
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      const result = await service.getResource(makeTeacher(), RESOURCE_ID);

      expect(result.correctionContent).toBe("<p>visible correction</p>");
      expect(result.attachments).toHaveLength(1);
    });

    it("always shows the correction to the author, even if not yet approved", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({
          authorUserId: TEACHER_ID,
          statementStatus: "APPROVED",
          correctionStatus: "PENDING",
          correctionContent: "<p>my draft correction</p>",
        }),
      );
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      const result = await service.getResource(makeTeacher(), RESOURCE_ID);

      expect(result.correctionContent).toBe("<p>my draft correction</p>");
    });

    it("hides a non-approved statement from a reader who is not the author", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({
          authorUserId: OTHER_TEACHER_ID,
          statementStatus: "PENDING",
        }),
      );

      await expect(
        service.getResource(makeTeacher(), RESOURCE_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("lets a platform role view a non-approved statement", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({
          authorUserId: OTHER_TEACHER_ID,
          statementStatus: "PENDING",
        }),
      );
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await expect(
        service.getResource(makePlatformAdmin(), RESOURCE_ID),
      ).resolves.toBeDefined();
    });
  });

  describe("moderation transitions", () => {
    it("approves a statement and stamps the acting admin", async () => {
      prisma.resource.findUnique.mockResolvedValueOnce(
        makeResourceRow({ statementStatus: "PENDING" }),
      );
      prisma.resource.findUnique.mockResolvedValueOnce(makeResourceRow());
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await service.approveStatement(makePlatformAdmin(), RESOURCE_ID);

      expect(prisma.resource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statementStatus: "APPROVED",
            statementApprovedByUserId: ADMIN_ID,
          }),
        }),
      );
    });

    it("rejects revokeStatement when the statement is not currently APPROVED", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({ statementStatus: "PENDING" }),
      );
      await expect(
        service.revokeStatement(makePlatformAdmin(), RESOURCE_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("revokes an APPROVED statement back to PENDING", async () => {
      prisma.resource.findUnique.mockResolvedValueOnce(
        makeResourceRow({ statementStatus: "APPROVED" }),
      );
      prisma.resource.findUnique.mockResolvedValueOnce(makeResourceRow());
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await service.revokeStatement(makePlatformAdmin(), RESOURCE_ID);

      expect(prisma.resource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statementStatus: "PENDING",
            statementApprovedByUserId: null,
          }),
        }),
      );
    });

    it("rejects a correction with an optional reason recorded in the audit log", async () => {
      prisma.resource.findUnique.mockResolvedValueOnce(
        makeResourceRow({ correctionStatus: "PENDING" }),
      );
      prisma.resource.findUnique.mockResolvedValueOnce(makeResourceRow());
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await service.rejectCorrection(makePlatformAdmin(), RESOURCE_ID, {
        reason: "Contenu incomplet",
      });

      expect(prisma.resource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            correctionStatus: "REJECTED",
            auditLogs: {
              create: {
                actorUserId: ADMIN_ID,
                action: "REJECT_CORRECTION",
                payloadJson: { reason: "Contenu incomplet" },
              },
            },
          }),
        }),
      );
    });
  });

  describe("favorites", () => {
    it("refuses to favorite a resource whose statement is not APPROVED", async () => {
      prisma.resource.findUnique.mockResolvedValue({
        id: RESOURCE_ID,
        statementStatus: "PENDING",
      });
      await expect(
        service.favoriteResource(makeTeacher(), RESOURCE_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("upserts a favorite for an APPROVED resource", async () => {
      prisma.resource.findUnique.mockResolvedValue({
        id: RESOURCE_ID,
        statementStatus: "APPROVED",
      });

      const result = await service.favoriteResource(makeTeacher(), RESOURCE_ID);

      expect(result).toEqual({ favorite: true });
      expect(prisma.resourceFavorite.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            resourceId_userId: { resourceId: RESOURCE_ID, userId: TEACHER_ID },
          },
        }),
      );
    });

    it("removes a favorite", async () => {
      const result = await service.unfavoriteResource(
        makeTeacher(),
        RESOURCE_ID,
      );
      expect(result).toEqual({ favorite: false });
      expect(prisma.resourceFavorite.deleteMany).toHaveBeenCalledWith({
        where: { resourceId: RESOURCE_ID, userId: TEACHER_ID },
      });
    });
  });

  describe("listSchoolsWithResources", () => {
    it("returns only schools that have an APPROVED assessment, sorted by name", async () => {
      prisma.resource.findMany.mockResolvedValue([
        { schoolId: "school-a" },
        { schoolId: "school-b" },
      ]);
      prisma.school.findMany.mockResolvedValue([
        { id: "school-a", name: "Alpha" },
        { id: "school-b", name: "Beta" },
      ]);

      const result = await service.listSchoolsWithResources();

      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            kind: "ASSESSMENT",
            statementStatus: "APPROVED",
            schoolId: { not: null },
          },
          distinct: ["schoolId"],
        }),
      );
      expect(result).toEqual([
        { id: "school-a", name: "Alpha" },
        { id: "school-b", name: "Beta" },
      ]);
    });

    it("returns an empty array without querying schools when no resource has one", async () => {
      prisma.resource.findMany.mockResolvedValue([]);

      const result = await service.listSchoolsWithResources();

      expect(result).toEqual([]);
      expect(prisma.school.findMany).not.toHaveBeenCalled();
    });
  });
});
