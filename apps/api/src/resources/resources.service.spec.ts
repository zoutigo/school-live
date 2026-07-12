import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateResourceDto } from "./dto/create-resource.dto.js";
import { ResourceSubmissionNotificationsService } from "./resource-submission-notifications.service.js";
import { ResourcesService } from "./resources.service.js";

const SCHOOL_ID = "school-1";
const TEACHER_ID = "teacher-1";
const OTHER_TEACHER_ID = "teacher-2";
const THIRD_TEACHER_ID = "teacher-3";
const ADMIN_ID = "admin-1";
const LEVEL_ID = "level-national-1";
const SUBJECT_ID = "subject-national-1";
const RESOURCE_ID = "resource-1";
const SUBMISSION_ID = "submission-1";

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
    statementSubmissionId: null,
    correctionContent: null,
    correctionStatus: "PENDING",
    correctionSubmissionId: null,
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

function makeSubmissionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SUBMISSION_ID,
    resourceId: RESOURCE_ID,
    part: "STATEMENT",
    authorUserId: TEACHER_ID,
    content: "<p>Enonce propose</p>",
    status: "DRAFT",
    reason: null,
    reviewedByUserId: null,
    reviewedAt: null,
    createdAt: new Date("2026-07-01T10:00:00Z"),
    updatedAt: new Date("2026-07-01T10:00:00Z"),
    ...overrides,
  };
}

function makePrismaMock() {
  const mock = {
    academicLevel: { findUnique: jest.fn() },
    subject: { findUnique: jest.fn() },
    resource: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    resourceSubmission: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
    },
    resourceAttachment: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    resourceAuditLog: {
      create: jest.fn(),
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
    $transaction: jest.fn(),
  };
  mock.$transaction.mockImplementation(
    async (callback: (tx: typeof mock) => unknown) => callback(mock),
  );
  return mock;
}

function makeInlineMediaMock() {
  return {
    syncEntityImages: jest.fn().mockResolvedValue(undefined),
    registerTempUpload: jest.fn().mockResolvedValue(undefined),
  };
}

function makeNotificationsMock() {
  return {
    notifyDiscarded: jest.fn().mockResolvedValue(undefined),
    notifyRejected: jest.fn().mockResolvedValue(undefined),
  };
}

describe("ResourcesService", () => {
  let service: ResourcesService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let inlineMedia: ReturnType<typeof makeInlineMediaMock>;
  let notifications: ReturnType<typeof makeNotificationsMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    inlineMedia = makeInlineMediaMock();
    notifications = makeNotificationsMock();

    prisma.academicLevel.findUnique.mockResolvedValue({ schoolId: null });
    prisma.subject.findUnique.mockResolvedValue({ schoolId: null });
    prisma.resource.findMany.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: prisma },
        { provide: InlineMediaService, useValue: inlineMedia },
        {
          provide: ResourceSubmissionNotificationsService,
          useValue: notifications,
        },
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

    it("creates a shell ASSESSMENT resource (no content) with a SUBMIT audit log entry", async () => {
      prisma.resource.create.mockResolvedValue({ id: RESOURCE_ID });
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({ statementContent: null }),
      );
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
      expect(prisma.resource.create.mock.calls[0][0].data).not.toHaveProperty(
        "statementContent",
      );
      expect(inlineMedia.syncEntityImages).not.toHaveBeenCalled();
    });

    it("creates a valid EXAM resource with schoolId=null", async () => {
      prisma.resource.create.mockResolvedValue({ id: RESOURCE_ID });
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

    it("blocks creation when a near-identical resource already exists (score >= 80%)", async () => {
      prisma.resource.findMany.mockResolvedValue([
        { id: "resource-existing", title: "Controle chapitre 3" },
      ]);

      await expect(
        service.createResource(makeTeacher(), makeCreatePayload()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.resource.create).not.toHaveBeenCalled();
    });

    it("warns (409) without creating when a similar resource exists (50-80%)", async () => {
      prisma.resource.findMany.mockResolvedValue([
        { id: "resource-existing", title: "Controle chap 3 bis" },
      ]);

      await expect(
        service.createResource(makeTeacher(), makeCreatePayload()),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.resource.create).not.toHaveBeenCalled();
    });

    it("bypasses the duplicate warning when confirmDuplicate is set", async () => {
      prisma.resource.findMany.mockResolvedValue([
        { id: "resource-existing", title: "Controle chap 3 bis" },
      ]);
      prisma.resource.create.mockResolvedValue({ id: RESOURCE_ID });
      prisma.resource.findUnique.mockResolvedValue(makeResourceRow());
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await expect(
        service.createResource(
          makeTeacher(),
          makeCreatePayload({ confirmDuplicate: true }),
        ),
      ).resolves.toBeDefined();
      expect(prisma.resource.create).toHaveBeenCalled();
    });
  });

  describe("listResources", () => {
    beforeEach(() => {
      prisma.resourceFavorite.findMany.mockResolvedValue([]);
    });

    it("defaults to page 1 with a limit of 20 when unspecified", async () => {
      prisma.resource.findMany.mockResolvedValue([]);
      prisma.resource.count.mockResolvedValue(0);

      const result = await service.listResources(makeTeacher(), {
        kind: "ASSESSMENT",
      });

      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it("applies skip/take from the requested page and limit", async () => {
      prisma.resource.findMany.mockResolvedValue([
        makeResourceRow({ id: "resource-page3" }),
      ]);
      prisma.resource.count.mockResolvedValue(45);

      const result = await service.listResources(makeTeacher(), {
        kind: "ASSESSMENT",
        page: 3,
        limit: 20,
      });

      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
      expect(result.total).toBe(45);
      expect(result.page).toBe(3);
      expect(result.items).toHaveLength(1);
    });

    it("passes the search term as a case-insensitive title filter", async () => {
      prisma.resource.findMany.mockResolvedValue([]);
      prisma.resource.count.mockResolvedValue(0);

      await service.listResources(makeTeacher(), {
        kind: "ASSESSMENT",
        search: "chapitre 3",
      });

      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: "chapitre 3", mode: "insensitive" },
          }),
        }),
      );
      expect(prisma.resource.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: "chapitre 3", mode: "insensitive" },
          }),
        }),
      );
    });

    it("flags isFavorite from the caller's favorites, independently of other resources", async () => {
      prisma.resource.findMany.mockResolvedValue([
        makeResourceRow({ id: "resource-fav" }),
        makeResourceRow({ id: "resource-not-fav" }),
      ]);
      prisma.resource.count.mockResolvedValue(2);
      prisma.resourceFavorite.findMany.mockResolvedValue([
        { resourceId: "resource-fav" },
      ]);

      const result = await service.listResources(makeTeacher(), {
        kind: "ASSESSMENT",
      });

      expect(
        result.items.find((item) => item.id === "resource-fav")?.isFavorite,
      ).toBe(true);
      expect(
        result.items.find((item) => item.id === "resource-not-fav")?.isFavorite,
      ).toBe(false);
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

    it("allows editing when the caller's id matches authorUserId, regardless of active role (national module, no privileged role)", async () => {
      prisma.resource.findUnique
        .mockResolvedValueOnce(makeResourceRow({ authorUserId: TEACHER_ID }))
        .mockResolvedValueOnce(makeResourceRow({ authorUserId: TEACHER_ID }));
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await expect(
        service.updateResource(
          makeTeacher({ activeRole: "PARENT" }),
          RESOURCE_ID,
          { title: "x" },
        ),
      ).resolves.toBeDefined();
    });

    it("allows a platform admin to edit a resource authored by someone else", async () => {
      prisma.resource.findUnique
        .mockResolvedValueOnce(
          makeResourceRow({ authorUserId: OTHER_TEACHER_ID }),
        )
        .mockResolvedValueOnce(
          makeResourceRow({ authorUserId: OTHER_TEACHER_ID }),
        );
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await expect(
        service.updateResource(makePlatformAdmin(), RESOURCE_ID, {
          title: "x",
        }),
      ).resolves.toBeDefined();
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
  });

  describe("getResource — correction visibility & attachment scoping", () => {
    it("masks the correction content when correctionStatus is not APPROVED, for a non-author reader", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({
          authorUserId: OTHER_TEACHER_ID,
          statementStatus: "APPROVED",
          statementSubmissionId: "sub-statement",
          correctionStatus: "PENDING",
          correctionContent: "<p>secret correction</p>",
          correctionSubmissionId: "sub-correction",
          statementContent: "<p>enonce</p>",
          attachments: [
            {
              id: "a1",
              part: "CORRECTION",
              fileName: "c.pdf",
              submissionId: "sub-correction",
            },
          ],
        }),
      );
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      const result = await service.getResource(makeTeacher(), RESOURCE_ID);

      expect(result.correctionContent).toBeNull();
      expect(result.attachments).toHaveLength(0);
    });

    it("shows the correction content and its attachments once correctionStatus is APPROVED", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({
          authorUserId: OTHER_TEACHER_ID,
          statementStatus: "APPROVED",
          statementSubmissionId: "sub-statement",
          correctionStatus: "APPROVED",
          correctionContent: "<p>visible correction</p>",
          correctionSubmissionId: "sub-correction",
          attachments: [
            {
              id: "a1",
              part: "CORRECTION",
              fileName: "c.pdf",
              submissionId: "sub-correction",
            },
          ],
        }),
      );
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      const result = await service.getResource(makeTeacher(), RESOURCE_ID);

      expect(result.correctionContent).toBe("<p>visible correction</p>");
      expect(result.attachments).toHaveLength(1);
    });

    it("filters out attachments from discarded/rejected sibling submissions", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({
          authorUserId: TEACHER_ID,
          statementStatus: "APPROVED",
          statementSubmissionId: "sub-winner",
          attachments: [
            {
              id: "a1",
              part: "STATEMENT",
              fileName: "winner.pdf",
              submissionId: "sub-winner",
            },
            {
              id: "a2",
              part: "STATEMENT",
              fileName: "discarded.pdf",
              submissionId: "sub-loser",
            },
          ],
        }),
      );
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      const result = await service.getResource(makeTeacher(), RESOURCE_ID);

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].fileName).toBe("winner.pdf");
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

    it("shows the correction to the author even when their active role is PARENT (national module, no privileged role)", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({
          authorUserId: TEACHER_ID,
          statementStatus: "APPROVED",
          correctionStatus: "PENDING",
          correctionContent: "<p>my draft correction</p>",
        }),
      );
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      const result = await service.getResource(
        makeTeacher({ activeRole: "PARENT" }),
        RESOURCE_ID,
      );

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

  describe("saveSubmissionDraft", () => {
    it("creates a new draft for the statement of an existing resource", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({ statementStatus: "PENDING" }),
      );
      prisma.resourceSubmission.findFirst.mockResolvedValue(null);
      prisma.resourceSubmission.create.mockResolvedValue(makeSubmissionRow());

      const result = await service.saveSubmissionDraft(
        makeTeacher(),
        RESOURCE_ID,
        "STATEMENT",
        { content: "<p>Enonce propose</p>", attachments: [] },
      );

      expect(prisma.resourceSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resourceId: RESOURCE_ID,
            part: "STATEMENT",
            authorUserId: TEACHER_ID,
            content: "<p>Enonce propose</p>",
            status: "DRAFT",
          }),
        }),
      );
      expect(result.id).toBe(SUBMISSION_ID);
      expect(prisma.resourceAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "SUBMISSION_DRAFT" }),
        }),
      );
    });

    it("updates the existing draft in place instead of creating a duplicate", async () => {
      prisma.resource.findUnique.mockResolvedValue(makeResourceRow());
      prisma.resourceSubmission.findFirst.mockResolvedValue(
        makeSubmissionRow({ status: "DRAFT" }),
      );
      prisma.resourceSubmission.update.mockResolvedValue(
        makeSubmissionRow({ content: "<p>updated</p>" }),
      );

      await service.saveSubmissionDraft(
        makeTeacher(),
        RESOURCE_ID,
        "STATEMENT",
        {
          content: "<p>updated</p>",
          attachments: [],
        },
      );

      expect(prisma.resourceSubmission.create).not.toHaveBeenCalled();
      expect(prisma.resourceSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SUBMISSION_ID },
          data: expect.objectContaining({ content: "<p>updated</p>" }),
        }),
      );
    });

    it("rejects a new draft while the author already has one AWAITING review", async () => {
      prisma.resource.findUnique.mockResolvedValue(makeResourceRow());
      prisma.resourceSubmission.findFirst.mockResolvedValue(
        makeSubmissionRow({ status: "AWAITING" }),
      );

      await expect(
        service.saveSubmissionDraft(makeTeacher(), RESOURCE_ID, "STATEMENT", {
          content: "<p>x</p>",
          attachments: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.resourceSubmission.create).not.toHaveBeenCalled();
    });

    it("refuses a correction draft while the statement is not yet approved", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({ statementStatus: "PENDING" }),
      );

      await expect(
        service.saveSubmissionDraft(makeTeacher(), RESOURCE_ID, "CORRECTION", {
          content: "<p>corrige</p>",
          attachments: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("allows a correction draft once the statement is approved", async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({ statementStatus: "APPROVED" }),
      );
      prisma.resourceSubmission.findFirst.mockResolvedValue(null);
      prisma.resourceSubmission.create.mockResolvedValue(
        makeSubmissionRow({ part: "CORRECTION" }),
      );

      await expect(
        service.saveSubmissionDraft(makeTeacher(), RESOURCE_ID, "CORRECTION", {
          content: "<p>corrige</p>",
          attachments: [],
        }),
      ).resolves.toBeDefined();
    });
  });

  describe("submitSubmission", () => {
    it("moves a DRAFT submission to AWAITING", async () => {
      prisma.resourceSubmission.findUnique.mockResolvedValue(
        makeSubmissionRow({ status: "DRAFT" }),
      );
      prisma.resourceSubmission.update.mockResolvedValue(
        makeSubmissionRow({ status: "AWAITING" }),
      );

      const result = await service.submitSubmission(
        makeTeacher(),
        RESOURCE_ID,
        SUBMISSION_ID,
      );

      expect(prisma.resourceSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SUBMISSION_ID },
          data: { status: "AWAITING" },
        }),
      );
      expect(result.status).toBe("AWAITING");
    });

    it("refuses to submit someone else's draft", async () => {
      prisma.resourceSubmission.findUnique.mockResolvedValue(
        makeSubmissionRow({ authorUserId: OTHER_TEACHER_ID }),
      );

      await expect(
        service.submitSubmission(makeTeacher(), RESOURCE_ID, SUBMISSION_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("refuses to re-submit a submission that is not a draft", async () => {
      prisma.resourceSubmission.findUnique.mockResolvedValue(
        makeSubmissionRow({ status: "AWAITING" }),
      );

      await expect(
        service.submitSubmission(makeTeacher(), RESOURCE_ID, SUBMISSION_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("re-checks that the statement is still approved before submitting a correction", async () => {
      prisma.resourceSubmission.findUnique.mockResolvedValue(
        makeSubmissionRow({ part: "CORRECTION", status: "DRAFT" }),
      );
      prisma.resource.findUnique.mockResolvedValue(
        makeResourceRow({ statementStatus: "PENDING" }),
      );

      await expect(
        service.submitSubmission(makeTeacher(), RESOURCE_ID, SUBMISSION_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("listSubmissions", () => {
    it("returns only AWAITING candidates for a platform admin", async () => {
      prisma.resource.findUnique.mockResolvedValue(makeResourceRow());
      prisma.resourceSubmission.findMany.mockResolvedValue([]);

      await service.listSubmissions(
        makePlatformAdmin(),
        RESOURCE_ID,
        "STATEMENT",
      );

      expect(prisma.resourceSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            resourceId: RESOURCE_ID,
            part: "STATEMENT",
            status: "AWAITING",
          },
        }),
      );
    });

    it("returns only the caller's own submissions for a non-admin", async () => {
      prisma.resource.findUnique.mockResolvedValue(makeResourceRow());
      prisma.resourceSubmission.findMany.mockResolvedValue([]);

      await service.listSubmissions(makeTeacher(), RESOURCE_ID, "STATEMENT");

      expect(prisma.resourceSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            resourceId: RESOURCE_ID,
            part: "STATEMENT",
            authorUserId: TEACHER_ID,
          },
        }),
      );
    });
  });

  describe("updateSubmissionContent", () => {
    it("replaces the content and attachments of an AWAITING submission and logs the edit", async () => {
      prisma.resourceSubmission.findUnique.mockResolvedValue(
        makeSubmissionRow({ status: "AWAITING", part: "CORRECTION" }),
      );
      prisma.resourceSubmission.update.mockResolvedValue(
        makeSubmissionRow({
          status: "AWAITING",
          part: "CORRECTION",
          content: "<p>Corrigé corrigé par l'admin</p>",
        }),
      );

      const result = await service.updateSubmissionContent(
        makePlatformAdmin(),
        SUBMISSION_ID,
        {
          content: "<p>Corrigé corrigé par l'admin</p>",
          attachments: [
            { fileName: "v2.pdf", fileUrl: "https://files/v2.pdf" },
          ],
        },
      );

      expect(prisma.resourceAttachment.deleteMany).toHaveBeenCalledWith({
        where: { submissionId: SUBMISSION_ID },
      });
      expect(prisma.resourceSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SUBMISSION_ID },
          data: expect.objectContaining({
            content: "<p>Corrigé corrigé par l'admin</p>",
            attachments: {
              create: [
                expect.objectContaining({
                  resourceId: RESOURCE_ID,
                  part: "CORRECTION",
                  fileName: "v2.pdf",
                  fileUrl: "https://files/v2.pdf",
                }),
              ],
            },
          }),
        }),
      );
      expect(prisma.resourceAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resourceId: RESOURCE_ID,
            action: "EDIT",
            payloadJson: { submissionId: SUBMISSION_ID },
          }),
        }),
      );
      expect(inlineMedia.syncEntityImages).toHaveBeenCalledWith(
        expect.objectContaining({
          nextBodyHtml: "<p>Corrigé corrigé par l'admin</p>",
        }),
      );
      expect(result.content).toBe("<p>Corrigé corrigé par l'admin</p>");
    });

    it("fails with NotFoundException when the submission does not exist", async () => {
      prisma.resourceSubmission.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSubmissionContent(makePlatformAdmin(), SUBMISSION_ID, {
          content: "<p>x</p>",
          attachments: [],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.resourceSubmission.update).not.toHaveBeenCalled();
    });

    it("fails with ConflictException when the submission was already reviewed", async () => {
      prisma.resourceSubmission.findUnique.mockResolvedValue(
        makeSubmissionRow({ status: "APPROVED" }),
      );

      await expect(
        service.updateSubmissionContent(makePlatformAdmin(), SUBMISSION_ID, {
          content: "<p>x</p>",
          attachments: [],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.resourceAttachment.deleteMany).not.toHaveBeenCalled();
      expect(prisma.resourceSubmission.update).not.toHaveBeenCalled();
    });
  });

  describe("approveSubmission", () => {
    it("approves the submission, discards AWAITING siblings, and notifies their authors", async () => {
      prisma.resourceSubmission.updateMany.mockResolvedValue({ count: 1 });
      prisma.resourceSubmission.findUniqueOrThrow.mockResolvedValue(
        makeSubmissionRow({ status: "APPROVED" }),
      );
      prisma.resourceSubmission.findMany.mockResolvedValue([
        { id: "submission-2", authorUserId: OTHER_TEACHER_ID },
        { id: "submission-3", authorUserId: THIRD_TEACHER_ID },
      ]);
      prisma.resource.update.mockResolvedValue({});
      prisma.resource.findUnique.mockResolvedValue(makeResourceRow());
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await service.approveSubmission(makePlatformAdmin(), SUBMISSION_ID);

      expect(prisma.resourceSubmission.updateMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: SUBMISSION_ID, status: "AWAITING" },
          data: expect.objectContaining({ status: "APPROVED" }),
        }),
      );
      expect(prisma.resourceSubmission.updateMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: { in: ["submission-2", "submission-3"] } },
          data: expect.objectContaining({ status: "DISCARDED" }),
        }),
      );
      expect(prisma.resource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statementContent: expect.any(String),
            statementStatus: "APPROVED",
            statementSubmissionId: SUBMISSION_ID,
          }),
        }),
      );
      expect(notifications.notifyDiscarded).toHaveBeenCalledTimes(2);
      expect(notifications.notifyDiscarded).toHaveBeenCalledWith(
        expect.objectContaining({ authorUserId: OTHER_TEACHER_ID }),
      );
      expect(notifications.notifyDiscarded).toHaveBeenCalledWith(
        expect.objectContaining({ authorUserId: THIRD_TEACHER_ID }),
      );
    });

    it("fails with a conflict when the submission was already reviewed by someone else (race condition)", async () => {
      prisma.resourceSubmission.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.approveSubmission(makePlatformAdmin(), SUBMISSION_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.resource.update).not.toHaveBeenCalled();
      expect(notifications.notifyDiscarded).not.toHaveBeenCalled();
    });

    it("simulates two concurrent admins: the second approval attempt is rejected", async () => {
      prisma.resourceSubmission.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });
      prisma.resourceSubmission.findUniqueOrThrow.mockResolvedValue(
        makeSubmissionRow({ status: "APPROVED" }),
      );
      prisma.resourceSubmission.findMany.mockResolvedValue([]);
      prisma.resource.update.mockResolvedValue({});
      prisma.resource.findUnique.mockResolvedValue(makeResourceRow());
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await expect(
        service.approveSubmission(makePlatformAdmin(), SUBMISSION_ID),
      ).resolves.toBeDefined();

      await expect(
        service.approveSubmission(makePlatformAdmin(), SUBMISSION_ID),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("rejectSubmission", () => {
    it("rejects an AWAITING submission with a reason and notifies its author", async () => {
      prisma.resourceSubmission.updateMany.mockResolvedValue({ count: 1 });
      prisma.resourceSubmission.findUniqueOrThrow.mockResolvedValue(
        makeSubmissionRow({ status: "REJECTED", reason: "Incomplet" }),
      );

      const result = await service.rejectSubmission(
        makePlatformAdmin(),
        SUBMISSION_ID,
        { reason: "Incomplet" },
      );

      expect(result).toEqual({ id: SUBMISSION_ID, status: "REJECTED" });
      expect(prisma.resourceAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "SUBMISSION_REJECT",
            payloadJson: { submissionId: SUBMISSION_ID, reason: "Incomplet" },
          }),
        }),
      );
      expect(notifications.notifyRejected).toHaveBeenCalledWith(
        expect.objectContaining({
          authorUserId: TEACHER_ID,
          reason: "Incomplet",
        }),
      );
    });

    it("fails with a conflict when the submission was already reviewed", async () => {
      prisma.resourceSubmission.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.rejectSubmission(makePlatformAdmin(), SUBMISSION_ID, {}),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(notifications.notifyRejected).not.toHaveBeenCalled();
    });
  });

  describe("revokeSubmission", () => {
    it("resets an APPROVED statement submission back to AWAITING and clears the resource pointer", async () => {
      prisma.resourceSubmission.findUnique.mockResolvedValue(
        makeSubmissionRow({ status: "APPROVED", part: "STATEMENT" }),
      );
      prisma.resource.update.mockResolvedValue({});
      prisma.resourceSubmission.update.mockResolvedValue(
        makeSubmissionRow({ status: "AWAITING" }),
      );
      prisma.resource.findUnique.mockResolvedValue(makeResourceRow());
      prisma.resourceFavorite.findUnique.mockResolvedValue(null);

      await service.revokeSubmission(makePlatformAdmin(), SUBMISSION_ID);

      expect(prisma.resource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statementStatus: "PENDING",
            statementSubmissionId: null,
          }),
        }),
      );
      expect(prisma.resourceSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SUBMISSION_ID },
          data: {
            status: "AWAITING",
            reviewedByUserId: null,
            reviewedAt: null,
          },
        }),
      );
    });

    it("refuses to revoke a submission that is not APPROVED", async () => {
      prisma.resourceSubmission.findUnique.mockResolvedValue(
        makeSubmissionRow({ status: "AWAITING" }),
      );

      await expect(
        service.revokeSubmission(makePlatformAdmin(), SUBMISSION_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
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

  describe("listAdminSubmissions", () => {
    it("defaults to AWAITING statement submissions", async () => {
      prisma.resourceSubmission.findMany.mockResolvedValue([]);
      prisma.resourceSubmission.count.mockResolvedValue(0);

      await service.listAdminSubmissions({});

      expect(prisma.resourceSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { part: "STATEMENT", status: "AWAITING" },
        }),
      );
    });

    it("scopes by kind and correction part when requested", async () => {
      prisma.resourceSubmission.findMany.mockResolvedValue([]);
      prisma.resourceSubmission.count.mockResolvedValue(0);

      await service.listAdminSubmissions({
        kind: "EXAM",
        part: "correction",
        status: "REJECTED",
      });

      expect(prisma.resourceSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            part: "CORRECTION",
            status: "REJECTED",
            resource: { kind: "EXAM" },
          },
        }),
      );
    });
  });
});
