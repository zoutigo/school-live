import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { HomeworkService } from "../src/homework/homework.service";

describe("HomeworkService", () => {
  const prisma = {
    homework: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const mediaClientService = {
    deleteImageByUrl: jest.fn(),
  };
  const inlineMediaService = {
    syncEntityImages: jest.fn(),
    removeEntityImages: jest.fn(),
  };

  const service = new HomeworkService(
    prisma as never,
    mediaClientService as never,
    inlineMediaService as never,
  );

  const teacherUser = {
    id: "teacher-1",
    platformRoles: [] as Array<"SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT">,
    memberships: [{ schoolId: "school-1", role: "TEACHER" as const }],
    profileCompleted: true,
    firstName: "Albert",
    lastName: "Mvondo",
  };

  beforeEach(() => {
    prisma.homework.create.mockReset();
    prisma.homework.update.mockReset();
    inlineMediaService.syncEntityImages.mockReset();
    inlineMediaService.removeEntityImages.mockReset();
    (service as any).ensureClassManageAccess = jest.fn().mockResolvedValue({
      id: "class-1",
      schoolYearId: "sy-1",
    });
    (service as any).ensureSubjectAccessibleForCreation = jest.fn();
    (service as any).loadMappedHomeworkRow = jest
      .fn()
      .mockResolvedValue({ id: "hw-1" });
    (service as any).findHomeworkOrThrow = jest.fn().mockResolvedValue({
      id: "hw-1",
      schoolId: "school-1",
      schoolYearId: "sy-1",
      classId: "class-1",
      subjectId: "sub-1",
      authorUserId: "teacher-1",
      title: "Preparation",
      contentHtml: "<p>Ancien contenu</p>",
      expectedAt: new Date("2026-05-05T07:00:00.000Z"),
      attachments: [
        {
          id: "att-1",
          fileName: "ancien.pdf",
          fileUrl: "https://cdn.example.com/homework/attachments/ancien.pdf",
          sizeLabel: "120 KB",
          mimeType: "application/pdf",
        },
      ],
      comments: [],
      completions: [],
      _count: { comments: 0 },
      subject: { id: "sub-1", name: "Mathematiques" },
      authorUser: {
        id: "teacher-1",
        firstName: "Albert",
        lastName: "Mvondo",
        memberships: [{ schoolId: "school-1", role: "TEACHER" as const }],
      },
    });
    (service as any).cleanupMediaUrls = jest.fn();
  });

  it("sanitizes homework content on creation and syncs inline media", async () => {
    prisma.homework.create.mockResolvedValue({ id: "hw-1" });

    await service.createHomework(teacherUser as never, "school-1", "class-1", {
      subjectId: "sub-1",
      title: "Problemes sur les fractions",
      contentHtml:
        '<p onclick="alert(1)">Recopie les exercices 3 et 4</p><script>alert(1)</script><img src="https://cdn.example.com/homework/inline-images/x.webp" />',
      expectedAt: "2026-05-06T17:00:00.000Z",
      attachments: [
        {
          fileName: "fiche.pdf",
          fileUrl: "https://cdn.example.com/homework/attachments/fiche.pdf",
          mimeType: "application/pdf",
        },
      ],
    });

    expect(prisma.homework.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contentHtml:
            '<p>Recopie les exercices 3 et 4</p><img src="https://cdn.example.com/homework/inline-images/x.webp" />',
        }),
      }),
    );
    expect(inlineMediaService.syncEntityImages).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "HOMEWORK",
        entityType: "HOMEWORK",
        nextBodyHtml:
          '<p>Recopie les exercices 3 et 4</p><img src="https://cdn.example.com/homework/inline-images/x.webp" />',
      }),
    );
  });

  it("stores null when sanitized homework content becomes empty on update", async () => {
    prisma.homework.update.mockResolvedValue({ id: "hw-1" });

    await service.updateHomework(
      teacherUser as never,
      "school-1",
      "class-1",
      "hw-1",
      {
        contentHtml: "<p><br></p><script>alert(1)</script>",
        attachments: [],
      },
    );

    expect(prisma.homework.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contentHtml: null,
        }),
      }),
    );
  });

  // ─── setCompletion / ensureViewerAccess — contrôle d'accès multi-rôle ────────

  describe("setCompletion — contrôle d'accès par rôle", () => {
    const CLASS_ENTITY = { id: "class-1", name: "6e C", schoolYearId: "sy-1" };
    const STUDENT_RECORD = {
      id: "student-1",
      firstName: "Lisa",
      lastName: "Mbele",
    };
    const HOMEWORK_RECORD = {
      id: "hw-1",
      schoolId: "school-1",
      classId: "class-1",
      schoolYearId: "sy-1",
      subjectId: "sub-1",
      authorUserId: "teacher-1",
      title: "Devoirs de maths",
      contentHtml: null,
      expectedAt: new Date("2026-05-05T17:00:00.000Z"),
      attachments: [],
      comments: [],
      completions: [],
      _count: { comments: 0 },
      subject: { id: "sub-1", name: "Mathématiques" },
      authorUser: {
        id: "teacher-1",
        firstName: "Albert",
        lastName: "Mvondo",
        memberships: [{ schoolId: "school-1", role: "TEACHER" as const }],
      },
    };

    function makePrismaForCompletion(
      linkedStudents: Array<{ student: typeof STUDENT_RECORD }>,
    ) {
      return {
        class: { findFirst: jest.fn().mockResolvedValue(CLASS_ENTITY) },
        teacherClassSubject: { findFirst: jest.fn().mockResolvedValue(null) },
        student: { findFirst: jest.fn().mockResolvedValue(null) },
        parentStudent: {
          findMany: jest.fn().mockResolvedValue(linkedStudents),
        },
        homeworkCompletion: { upsert: jest.fn().mockResolvedValue({}) },
        homework: {
          findFirst: jest.fn().mockResolvedValue(HOMEWORK_RECORD),
          findUnique: jest.fn().mockResolvedValue(HOMEWORK_RECORD),
        },
      };
    }

    it("autorise un parent (rôle unique) à marquer un devoir comme fait", async () => {
      const prismaForTest = makePrismaForCompletion([
        { student: STUDENT_RECORD },
      ]);
      const svc = new HomeworkService(
        prismaForTest as never,
        mediaClientService as never,
        inlineMediaService as never,
      );
      (svc as any).getHomeworkDetail = jest
        .fn()
        .mockResolvedValue({ id: "hw-1" });

      const parentUser = {
        id: "parent-1",
        activeRole: "PARENT",
        platformRoles: [] as never[],
        memberships: [{ schoolId: "school-1", role: "PARENT" as const }],
        profileCompleted: true,
        firstName: "Robert",
        lastName: "Ntamack",
      };

      await expect(
        svc.setCompletion(parentUser as never, "school-1", "class-1", "hw-1", {
          done: true,
          studentId: "student-1",
        }),
      ).resolves.toBeDefined();

      expect(prismaForTest.homeworkCompletion.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            studentId: "student-1",
            homeworkId: "hw-1",
          }),
        }),
      );
    });

    it("autorise un utilisateur multi-rôle (teacher+parent) avec activeRole=PARENT", async () => {
      const prismaForTest = makePrismaForCompletion([
        { student: STUDENT_RECORD },
      ]);
      const svc = new HomeworkService(
        prismaForTest as never,
        mediaClientService as never,
        inlineMediaService as never,
      );
      (svc as any).getHomeworkDetail = jest
        .fn()
        .mockResolvedValue({ id: "hw-1" });

      // Même utilisateur : TEACHER et PARENT dans la même école
      const multiRoleUser = {
        id: "valery-1",
        activeRole: "PARENT", // ← actif en tant que parent
        platformRoles: [] as never[],
        memberships: [
          { schoolId: "school-1", role: "TEACHER" as const },
          { schoolId: "school-1", role: "PARENT" as const },
        ],
        profileCompleted: true,
        firstName: "Valery",
        lastName: "Mbele",
      };

      await expect(
        svc.setCompletion(
          multiRoleUser as never,
          "school-1",
          "class-1",
          "hw-1",
          { done: true, studentId: "student-1" },
        ),
      ).resolves.toBeDefined();
    });

    it("bloque un utilisateur multi-rôle (teacher+parent) avec activeRole=TEACHER", async () => {
      const prismaForTest = {
        ...makePrismaForCompletion([]),
        teacherClassSubject: {
          findFirst: jest.fn().mockResolvedValue({ id: "assign-1" }),
        },
      };
      const svc = new HomeworkService(
        prismaForTest as never,
        mediaClientService as never,
        inlineMediaService as never,
      );

      const multiRoleUserAsTeacher = {
        id: "valery-1",
        activeRole: "TEACHER", // ← actif en tant qu'enseignant
        platformRoles: [] as never[],
        memberships: [
          { schoolId: "school-1", role: "TEACHER" as const },
          { schoolId: "school-1", role: "PARENT" as const },
        ],
        profileCompleted: true,
        firstName: "Valery",
        lastName: "Mbele",
      };

      await expect(
        svc.setCompletion(
          multiRoleUserAsTeacher as never,
          "school-1",
          "class-1",
          "hw-1",
          { done: true, studentId: "student-1" },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("bloque un enseignant (rôle unique) sur setCompletion", async () => {
      const prismaForTest = {
        ...makePrismaForCompletion([]),
        teacherClassSubject: {
          findFirst: jest.fn().mockResolvedValue({ id: "assign-1" }),
        },
      };
      const svc = new HomeworkService(
        prismaForTest as never,
        mediaClientService as never,
        inlineMediaService as never,
      );

      await expect(
        svc.setCompletion(teacherUser as never, "school-1", "class-1", "hw-1", {
          done: true,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("exige studentId quand le parent a plusieurs enfants dans la même classe", async () => {
      const prismaForTest = makePrismaForCompletion([
        { student: STUDENT_RECORD },
        {
          student: { id: "student-2", firstName: "Jean", lastName: "Mbele" },
        },
      ]);
      const svc = new HomeworkService(
        prismaForTest as never,
        mediaClientService as never,
        inlineMediaService as never,
      );

      const parentUser = {
        id: "parent-1",
        activeRole: "PARENT",
        platformRoles: [] as never[],
        memberships: [{ schoolId: "school-1", role: "PARENT" as const }],
        profileCompleted: true,
        firstName: "Robert",
        lastName: "Ntamack",
      };

      await expect(
        svc.setCompletion(parentUser as never, "school-1", "class-1", "hw-1", {
          done: true,
          // studentId omis
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("bloque un parent sans lien avec la classe sur setCompletion", async () => {
      const prismaForTest = makePrismaForCompletion([]); // aucun enfant lié
      const svc = new HomeworkService(
        prismaForTest as never,
        mediaClientService as never,
        inlineMediaService as never,
      );

      const parentUser = {
        id: "parent-stranger",
        activeRole: "PARENT",
        platformRoles: [] as never[],
        memberships: [{ schoolId: "school-1", role: "PARENT" as const }],
        profileCompleted: true,
        firstName: "Inconnu",
        lastName: "Parent",
      };

      await expect(
        svc.setCompletion(parentUser as never, "school-1", "class-1", "hw-1", {
          done: true,
          studentId: "student-99",
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  it("forbids a teacher from managing another teacher homework", async () => {
    (service as any).ensureClassManageAccess = jest.fn().mockResolvedValue({
      id: "class-1",
      schoolYearId: "sy-1",
    });
    (service as any).findHomeworkOrThrow = jest.fn().mockResolvedValue({
      id: "hw-1",
      schoolId: "school-1",
      schoolYearId: "sy-1",
      classId: "class-1",
      subjectId: "sub-1",
      authorUserId: "teacher-2",
      title: "Preparation",
      contentHtml: null,
      expectedAt: new Date("2026-05-05T07:00:00.000Z"),
      attachments: [],
      comments: [],
      completions: [],
      _count: { comments: 0 },
      subject: { id: "sub-1", name: "Mathematiques" },
      authorUser: {
        id: "teacher-2",
        firstName: "Aline",
        lastName: "Bika",
        memberships: [{ schoolId: "school-1", role: "TEACHER" as const }],
      },
    });

    await expect(
      (service as any).assertCanManageHomework(
        teacherUser,
        "school-1",
        "class-1",
        await (service as any).findHomeworkOrThrow(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
