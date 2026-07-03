import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { HomeworkNotificationsService } from "../notifications/homework-notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { HomeworkService } from "./homework.service.js";
import {
  translateHomeworkError,
  type HomeworkLocale,
} from "./homework.translations.js";

const SCHOOL_ID = "school-1";
const CLASS_ID = "class-1";
const SCHOOL_YEAR_ID = "sy-1";
const HOMEWORK_ID = "hw-1";
const SUBJECT_ID = "sub-1";
const TEACHER_USER_ID = "teacher-1";
const STUDENT_ID = "stu-1";
const PARENT_USER_ID = "parent-1";
const STUDENT_USER_ID = "student-user-1";

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: TEACHER_USER_ID,
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

function makeClassEntity() {
  return { id: CLASS_ID, name: "6eC", schoolYearId: SCHOOL_YEAR_ID };
}

function makeSubjectEntity() {
  return { id: SUBJECT_ID };
}

function makeAssignment() {
  return { id: "assign-1" };
}

function makeHomeworkEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: HOMEWORK_ID,
    schoolId: SCHOOL_ID,
    classId: CLASS_ID,
    schoolYearId: SCHOOL_YEAR_ID,
    subjectId: SUBJECT_ID,
    authorUserId: TEACHER_USER_ID,
    title: "Conjugaison chapitre 3",
    contentHtml: "<p>Apprendre les verbes</p>",
    expectedAt: new Date("2026-07-10T08:00:00Z"),
    createdAt: new Date("2026-07-01T10:00:00Z"),
    updatedAt: new Date("2026-07-01T10:00:00Z"),
    subject: { id: SUBJECT_ID, name: "Anglais" },
    authorUser: {
      id: TEACHER_USER_ID,
      firstName: "Paul",
      lastName: "Martin",
      memberships: [{ schoolId: SCHOOL_ID, role: "TEACHER" }],
    },
    attachments: [],
    comments: [],
    completions: [],
    _count: { comments: 0 },
    ...overrides,
  };
}

function makeEnrollment(studentId = STUDENT_ID) {
  return {
    student: {
      id: studentId,
      firstName: "Alice",
      lastName: "Dupont",
    },
  };
}

function makePrismaMock() {
  return {
    class: { findFirst: jest.fn() },
    subject: { findFirst: jest.fn() },
    teacherClassSubject: { findFirst: jest.fn() },
    student: { findFirst: jest.fn() },
    parentStudent: { findMany: jest.fn() },
    enrollment: { findMany: jest.fn() },
    classTimetableSubjectStyle: { findMany: jest.fn() },
    homework: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    homeworkComment: { create: jest.fn() },
    homeworkCompletion: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

function makeInlineMediaMock() {
  return {
    syncEntityImages: jest.fn().mockResolvedValue(undefined),
    removeEntityImages: jest.fn().mockResolvedValue(undefined),
  };
}

function makeMediaClientMock() {
  return {
    deleteImageByUrl: jest.fn().mockResolvedValue(undefined),
  };
}

function makeNotificationsMock() {
  return {
    enqueue: jest.fn().mockResolvedValue(undefined),
  };
}

describe("HomeworkService", () => {
  let service: HomeworkService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let inlineMedia: ReturnType<typeof makeInlineMediaMock>;
  let mediaClient: ReturnType<typeof makeMediaClientMock>;
  let notifications: ReturnType<typeof makeNotificationsMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    inlineMedia = makeInlineMediaMock();
    mediaClient = makeMediaClientMock();
    notifications = makeNotificationsMock();

    prisma.classTimetableSubjectStyle.findMany.mockResolvedValue([]);
    prisma.enrollment.findMany.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        HomeworkService,
        { provide: PrismaService, useValue: prisma },
        { provide: InlineMediaService, useValue: inlineMedia },
        { provide: MediaClientService, useValue: mediaClient },
        { provide: HomeworkNotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(HomeworkService);
  });

  // ─── RBAC helpers ──────────────────────────────────────────────────────

  describe("ensureViewerAccess (via listClassHomework)", () => {
    it("permet à SCHOOL_ADMIN de lister sans restriction", async () => {
      const adminUser = makeUser({
        activeRole: "SCHOOL_ADMIN",
        memberships: [{ schoolId: SCHOOL_ID, role: "SCHOOL_ADMIN" }],
      });
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.homework.findMany.mockResolvedValue([]);

      const result = await service.listClassHomework(
        adminUser,
        SCHOOL_ID,
        CLASS_ID,
        {},
      );
      expect(result).toEqual([]);
    });

    it("lève ForbiddenException si l'enseignant n'est pas affecté à la classe", async () => {
      const teacher = makeUser({ activeRole: "TEACHER" });
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.teacherClassSubject.findFirst.mockResolvedValue(null);

      await expect(
        service.listClassHomework(teacher, SCHOOL_ID, CLASS_ID, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lève ForbiddenException si l'élève n'est pas inscrit dans la classe", async () => {
      const studentUser = makeUser({
        id: STUDENT_USER_ID,
        activeRole: "STUDENT",
        memberships: [{ schoolId: SCHOOL_ID, role: "STUDENT" }],
      });
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.listClassHomework(studentUser, SCHOOL_ID, CLASS_ID, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lève ForbiddenException si le parent n'a aucun enfant dans la classe", async () => {
      const parentUser = makeUser({
        id: PARENT_USER_ID,
        activeRole: "PARENT",
        memberships: [{ schoolId: SCHOOL_ID, role: "PARENT" }],
      });
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.parentStudent.findMany.mockResolvedValue([]);

      await expect(
        service.listClassHomework(parentUser, SCHOOL_ID, CLASS_ID, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lève NotFoundException si la classe n'existe pas", async () => {
      const teacher = makeUser({ activeRole: "TEACHER" });
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.listClassHomework(teacher, SCHOOL_ID, "unknown-class", {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createHomework ─────────────────────────────────────────────────────

  describe("createHomework", () => {
    beforeEach(() => {
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.teacherClassSubject.findFirst.mockResolvedValue(makeAssignment());
      prisma.subject.findFirst.mockResolvedValue(makeSubjectEntity());
      prisma.homework.create.mockResolvedValue({ id: HOMEWORK_ID });
      prisma.homework.findFirst.mockResolvedValue(makeHomeworkEntity());
    });

    it("crée un devoir et renvoie la row mappée", async () => {
      const teacher = makeUser({ activeRole: "TEACHER" });
      const result = await service.createHomework(
        teacher,
        SCHOOL_ID,
        CLASS_ID,
        {
          subjectId: SUBJECT_ID,
          title: "Devoir test",
          expectedAt: "2026-07-10T08:00:00Z",
        },
      );

      expect(prisma.homework.create).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(HOMEWORK_ID);
      expect(result.title).toBe("Conjugaison chapitre 3");
    });

    it("envoie les notifications après création", async () => {
      const teacher = makeUser({ activeRole: "TEACHER" });
      await service.createHomework(teacher, SCHOOL_ID, CLASS_ID, {
        subjectId: SUBJECT_ID,
        title: "Devoir test",
        expectedAt: "2026-07-10T08:00:00Z",
      });

      expect(notifications.enqueue).toHaveBeenCalledWith({
        schoolId: SCHOOL_ID,
        classId: CLASS_ID,
        homeworkId: HOMEWORK_ID,
      });
    });

    it("appelle syncEntityImages avec les bons paramètres", async () => {
      const teacher = makeUser({ activeRole: "TEACHER" });
      await service.createHomework(teacher, SCHOOL_ID, CLASS_ID, {
        subjectId: SUBJECT_ID,
        title: "Devoir test",
        contentHtml: "<p>Consigne</p>",
        expectedAt: "2026-07-10T08:00:00Z",
      });

      expect(inlineMedia.syncEntityImages).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: SCHOOL_ID,
          uploadedByUserId: TEACHER_USER_ID,
          entityId: HOMEWORK_ID,
        }),
      );
    });

    it("lève ForbiddenException si la matière n'est pas accessible au teacher", async () => {
      prisma.teacherClassSubject.findFirst
        .mockResolvedValueOnce(makeAssignment())
        .mockResolvedValueOnce(null);

      const teacher = makeUser({ activeRole: "TEACHER" });
      await expect(
        service.createHomework(teacher, SCHOOL_ID, CLASS_ID, {
          subjectId: "other-subject",
          title: "Devoir test",
          expectedAt: "2026-07-10T08:00:00Z",
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lève NotFoundException si la matière n'existe pas", async () => {
      prisma.subject.findFirst.mockResolvedValue(null);

      const teacher = makeUser({ activeRole: "TEACHER" });
      await expect(
        service.createHomework(teacher, SCHOOL_ID, CLASS_ID, {
          subjectId: "unknown-sub",
          title: "Devoir test",
          expectedAt: "2026-07-10T08:00:00Z",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("crée le devoir avec les pièces jointes normalisées", async () => {
      const teacher = makeUser({ activeRole: "TEACHER" });
      const hwWithAttachments = makeHomeworkEntity({
        attachments: [
          {
            id: "att-1",
            fileName: "cours.pdf",
            fileUrl: "http://minio/cours.pdf",
            sizeLabel: "120 Ko",
            mimeType: "application/pdf",
            createdAt: new Date(),
          },
        ],
      });
      prisma.homework.create.mockResolvedValue({ id: HOMEWORK_ID });
      prisma.homework.findFirst.mockResolvedValue(hwWithAttachments);

      const result = await service.createHomework(
        teacher,
        SCHOOL_ID,
        CLASS_ID,
        {
          subjectId: SUBJECT_ID,
          title: "Devoir test",
          expectedAt: "2026-07-10T08:00:00Z",
          attachments: [
            {
              fileName: "cours.pdf",
              fileUrl: "http://minio/cours.pdf",
              sizeLabel: "120 Ko",
              mimeType: "application/pdf",
            },
          ],
        },
      );

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].fileName).toBe("cours.pdf");
    });
  });

  // ─── updateHomework ─────────────────────────────────────────────────────

  describe("updateHomework", () => {
    const homework = makeHomeworkEntity();

    beforeEach(() => {
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.teacherClassSubject.findFirst.mockResolvedValue(makeAssignment());
      prisma.subject.findFirst.mockResolvedValue(makeSubjectEntity());
      prisma.homework.findFirst.mockResolvedValue(homework);
      prisma.homework.update.mockResolvedValue({});
    });

    it("met à jour le devoir et renvoie la row mappée", async () => {
      const updatedHw = makeHomeworkEntity({ title: "Titre modifié" });
      prisma.homework.findFirst
        .mockResolvedValueOnce(homework)
        .mockResolvedValueOnce(updatedHw);

      const teacher = makeUser({ activeRole: "TEACHER" });
      const result = await service.updateHomework(
        teacher,
        SCHOOL_ID,
        CLASS_ID,
        HOMEWORK_ID,
        { title: "Titre modifié" },
      );

      expect(prisma.homework.update).toHaveBeenCalledTimes(1);
      expect(result.title).toBe("Titre modifié");
    });

    it("lève ForbiddenException si le teacher n'est pas l'auteur", async () => {
      const otherTeacher = makeUser({
        id: "other-teacher",
        activeRole: "TEACHER",
      });
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.teacherClassSubject.findFirst.mockResolvedValue(makeAssignment());

      await expect(
        service.updateHomework(otherTeacher, SCHOOL_ID, CLASS_ID, HOMEWORK_ID, {
          title: "Modif",
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("SCHOOL_ADMIN peut modifier le devoir d'un autre auteur", async () => {
      const adminUser = makeUser({
        id: "admin-1",
        activeRole: "SCHOOL_ADMIN",
        memberships: [{ schoolId: SCHOOL_ID, role: "SCHOOL_ADMIN" }],
      });
      const updatedHw = makeHomeworkEntity({ title: "Modifié par admin" });
      prisma.homework.findFirst
        .mockResolvedValueOnce(homework)
        .mockResolvedValueOnce(updatedHw);

      const result = await service.updateHomework(
        adminUser,
        SCHOOL_ID,
        CLASS_ID,
        HOMEWORK_ID,
        { title: "Modifié par admin" },
      );

      expect(result.title).toBe("Modifié par admin");
    });

    it("nettoie les URLs de médias supprimées", async () => {
      const hwWithAttachment = makeHomeworkEntity({
        attachments: [
          {
            id: "att-1",
            fileName: "old.pdf",
            fileUrl: "http://minio/old.pdf",
            sizeLabel: null,
            mimeType: null,
            createdAt: new Date(),
          },
        ],
      });
      prisma.homework.findFirst
        .mockResolvedValueOnce(hwWithAttachment)
        .mockResolvedValueOnce(makeHomeworkEntity());

      const teacher = makeUser({ activeRole: "TEACHER" });
      await service.updateHomework(teacher, SCHOOL_ID, CLASS_ID, HOMEWORK_ID, {
        attachments: [],
      });

      expect(mediaClient.deleteImageByUrl).toHaveBeenCalledWith(
        "http://minio/old.pdf",
      );
    });
  });

  // ─── deleteHomework ─────────────────────────────────────────────────────

  describe("deleteHomework", () => {
    it("supprime le devoir et renvoie { success: true }", async () => {
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.teacherClassSubject.findFirst.mockResolvedValue(makeAssignment());
      prisma.homework.findFirst.mockResolvedValue(makeHomeworkEntity());
      prisma.homework.delete.mockResolvedValue({});

      const teacher = makeUser({ activeRole: "TEACHER" });
      const result = await service.deleteHomework(
        teacher,
        SCHOOL_ID,
        CLASS_ID,
        HOMEWORK_ID,
      );

      expect(result).toEqual({ success: true, homeworkId: HOMEWORK_ID });
      expect(prisma.homework.delete).toHaveBeenCalledWith({
        where: { id: HOMEWORK_ID },
      });
    });

    it("supprime les images inline liées", async () => {
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.teacherClassSubject.findFirst.mockResolvedValue(makeAssignment());
      prisma.homework.findFirst.mockResolvedValue(makeHomeworkEntity());
      prisma.homework.delete.mockResolvedValue({});

      const teacher = makeUser({ activeRole: "TEACHER" });
      await service.deleteHomework(teacher, SCHOOL_ID, CLASS_ID, HOMEWORK_ID);

      expect(inlineMedia.removeEntityImages).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: HOMEWORK_ID }),
      );
    });

    it("lève NotFoundException si le devoir n'existe pas", async () => {
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.teacherClassSubject.findFirst.mockResolvedValue(makeAssignment());
      prisma.homework.findFirst.mockResolvedValue(null);

      const teacher = makeUser({ activeRole: "TEACHER" });
      await expect(
        service.deleteHomework(teacher, SCHOOL_ID, CLASS_ID, "unknown-hw"),
      ).rejects.toThrow(NotFoundException);
    });

    it("lève ForbiddenException si le teacher n'est pas l'auteur", async () => {
      const otherTeacher = makeUser({ id: "other", activeRole: "TEACHER" });
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.teacherClassSubject.findFirst.mockResolvedValue(makeAssignment());
      prisma.homework.findFirst.mockResolvedValue(makeHomeworkEntity());

      await expect(
        service.deleteHomework(otherTeacher, SCHOOL_ID, CLASS_ID, HOMEWORK_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── addComment ─────────────────────────────────────────────────────────

  describe("addComment", () => {
    beforeEach(() => {
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.teacherClassSubject.findFirst.mockResolvedValue(makeAssignment());
      prisma.homework.findFirst.mockResolvedValue(makeHomeworkEntity());
      prisma.homeworkComment.create.mockResolvedValue({});
      prisma.enrollment.findMany.mockResolvedValue([makeEnrollment()]);
    });

    it("ajoute un commentaire et renvoie le détail mis à jour", async () => {
      const hwWithComment = makeHomeworkEntity({
        comments: [
          {
            id: "cmt-1",
            body: "Super devoir !",
            authorUserId: TEACHER_USER_ID,
            studentId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            authorUser: {
              id: TEACHER_USER_ID,
              firstName: "Paul",
              lastName: "Martin",
              memberships: [{ schoolId: SCHOOL_ID, role: "TEACHER" }],
            },
          },
        ],
      });
      prisma.homework.findFirst
        .mockResolvedValueOnce(makeHomeworkEntity())
        .mockResolvedValueOnce(hwWithComment);

      const teacher = makeUser({ activeRole: "TEACHER" });
      const result = await service.addComment(
        teacher,
        SCHOOL_ID,
        CLASS_ID,
        HOMEWORK_ID,
        { body: "Super devoir !" },
      );

      expect(prisma.homeworkComment.create).toHaveBeenCalledTimes(1);
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].body).toBe("Super devoir !");
    });

    it("lève BadRequestException si le corps du commentaire est vide", async () => {
      const teacher = makeUser({ activeRole: "TEACHER" });
      await expect(
        service.addComment(teacher, SCHOOL_ID, CLASS_ID, HOMEWORK_ID, {
          body: "   ",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("marque le commentaire comme mine=true pour l'auteur", async () => {
      const hwWithComment = makeHomeworkEntity({
        comments: [
          {
            id: "cmt-1",
            body: "Mon commentaire",
            authorUserId: TEACHER_USER_ID,
            studentId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            authorUser: {
              id: TEACHER_USER_ID,
              firstName: "Paul",
              lastName: "Martin",
              memberships: [{ schoolId: SCHOOL_ID, role: "TEACHER" }],
            },
          },
        ],
      });
      prisma.homework.findFirst
        .mockResolvedValueOnce(makeHomeworkEntity())
        .mockResolvedValueOnce(hwWithComment);

      const teacher = makeUser({ activeRole: "TEACHER" });
      const result = await service.addComment(
        teacher,
        SCHOOL_ID,
        CLASS_ID,
        HOMEWORK_ID,
        { body: "Mon commentaire" },
      );

      expect(result.comments[0].mine).toBe(true);
    });
  });

  // ─── setCompletion ───────────────────────────────────────────────────────

  describe("setCompletion", () => {
    const studentUser = makeUser({
      id: STUDENT_USER_ID,
      activeRole: "STUDENT",
      memberships: [{ schoolId: SCHOOL_ID, role: "STUDENT" }],
    });

    beforeEach(() => {
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.student.findFirst.mockResolvedValue({
        id: STUDENT_ID,
        firstName: "Alice",
        lastName: "Dupont",
      });
      prisma.homework.findFirst.mockResolvedValue(makeHomeworkEntity());
      prisma.homeworkCompletion.upsert.mockResolvedValue({});
      prisma.homeworkCompletion.deleteMany.mockResolvedValue({});
      prisma.enrollment.findMany.mockResolvedValue([makeEnrollment()]);
    });

    it("marque le devoir comme fait (done=true) → upsert", async () => {
      const hwDone = makeHomeworkEntity({
        completions: [
          {
            doneAt: new Date(),
            student: { id: STUDENT_ID, firstName: "Alice", lastName: "Dupont" },
          },
        ],
      });
      prisma.homework.findFirst
        .mockResolvedValueOnce(makeHomeworkEntity())
        .mockResolvedValueOnce(hwDone);

      const result = await service.setCompletion(
        studentUser,
        SCHOOL_ID,
        CLASS_ID,
        HOMEWORK_ID,
        { done: true },
      );

      expect(prisma.homeworkCompletion.upsert).toHaveBeenCalledTimes(1);
      expect(result.myDoneAt).not.toBeNull();
    });

    it("marque le devoir comme non fait (done=false) → deleteMany", async () => {
      prisma.homework.findFirst
        .mockResolvedValueOnce(makeHomeworkEntity())
        .mockResolvedValueOnce(makeHomeworkEntity());

      const result = await service.setCompletion(
        studentUser,
        SCHOOL_ID,
        CLASS_ID,
        HOMEWORK_ID,
        { done: false },
      );

      expect(prisma.homeworkCompletion.deleteMany).toHaveBeenCalledTimes(1);
      expect(result.myDoneAt).toBeNull();
    });

    it("lève ForbiddenException si l'utilisateur n'est pas un élève ou parent", async () => {
      const adminUser = makeUser({
        activeRole: "SCHOOL_ADMIN",
        memberships: [{ schoolId: SCHOOL_ID, role: "SCHOOL_ADMIN" }],
      });

      await expect(
        service.setCompletion(adminUser, SCHOOL_ID, CLASS_ID, HOMEWORK_ID, {
          done: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lève ForbiddenException si l'élève n'est pas inscrit dans la classe", async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.setCompletion(studentUser, SCHOOL_ID, CLASS_ID, HOMEWORK_ID, {
          done: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── mapHomeworkRow (comportement via listClassHomework) ─────────────────

  describe("mapHomeworkRow via listClassHomework", () => {
    it("inclut myDoneAt si l'élève a complété le devoir", async () => {
      const doneAt = new Date("2026-07-05T10:00:00Z");
      const studentRecord = {
        id: STUDENT_ID,
        firstName: "Alice",
        lastName: "Dupont",
      };
      const studentUser = makeUser({
        id: STUDENT_USER_ID,
        activeRole: "STUDENT",
        memberships: [{ schoolId: SCHOOL_ID, role: "STUDENT" }],
      });
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.student.findFirst.mockResolvedValue(studentRecord);
      prisma.homework.findMany.mockResolvedValue([
        makeHomeworkEntity({
          completions: [{ doneAt, student: studentRecord }],
        }),
      ]);

      const [hw] = await service.listClassHomework(
        studentUser,
        SCHOOL_ID,
        CLASS_ID,
        {},
      );
      expect(hw.myDoneAt).toBe(doneAt.toISOString());
    });

    it("renvoie myDoneAt=null si l'élève n'a pas complété le devoir", async () => {
      const studentRecord = {
        id: STUDENT_ID,
        firstName: "Alice",
        lastName: "Dupont",
      };
      const studentUser = makeUser({
        id: STUDENT_USER_ID,
        activeRole: "STUDENT",
        memberships: [{ schoolId: SCHOOL_ID, role: "STUDENT" }],
      });
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.student.findFirst.mockResolvedValue(studentRecord);
      prisma.homework.findMany.mockResolvedValue([makeHomeworkEntity()]);

      const [hw] = await service.listClassHomework(
        studentUser,
        SCHOOL_ID,
        CLASS_ID,
        {},
      );
      expect(hw.myDoneAt).toBeNull();
    });

    it("inclut le résumé de complétion pour un enseignant", async () => {
      const teacher = makeUser({ activeRole: "TEACHER" });
      prisma.class.findFirst.mockResolvedValue(makeClassEntity());
      prisma.teacherClassSubject.findFirst.mockResolvedValue(makeAssignment());
      prisma.enrollment.findMany.mockResolvedValue([makeEnrollment()]);
      prisma.homework.findMany.mockResolvedValue([makeHomeworkEntity()]);

      const [hw] = await service.listClassHomework(
        teacher,
        SCHOOL_ID,
        CLASS_ID,
        {},
      );

      expect(hw.summary).not.toBeNull();
      expect(hw.summary?.totalStudents).toBe(1);
      expect(hw.summary?.doneStudents).toBe(0);
    });
  });

  // ─── Erreurs localisées ──────────────────────────────────────────────────

  describe("translated errors", () => {
    it("renvoie une erreur en français si preferredLocale=FR", async () => {
      const teacher = makeUser({ preferredLocale: "FR" });
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.listClassHomework(teacher, SCHOOL_ID, CLASS_ID, {}),
      ).rejects.toThrow(
        new NotFoundException(
          translateHomeworkError(
            "fr" as HomeworkLocale,
            "homework.errors.classNotFound",
          ),
        ),
      );
    });

    it("renvoie une erreur en anglais si preferredLocale=EN", async () => {
      const teacher = makeUser({ preferredLocale: "EN" });
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.listClassHomework(teacher, SCHOOL_ID, CLASS_ID, {}),
      ).rejects.toThrow(
        new NotFoundException(
          translateHomeworkError(
            "en" as HomeworkLocale,
            "homework.errors.classNotFound",
          ),
        ),
      );
    });
  });
});
