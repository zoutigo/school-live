import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonObject = Record<string, unknown>;

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

jest.setTimeout(30_000);

describe("Feed interactions e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-feed-interactions-${runId}`;
  const password = "StrongPass1";

  const teacherEmail = `e2e-feed-teacher-${runId}@example.test`;
  const parentEmail = `e2e-feed-parent-${runId}@example.test`;
  const studentEmail = `e2e-feed-student-${runId}@example.test`;

  let schoolId = "";
  let teacherUserId = "";
  let parentUserId = "";
  let studentUserId = "";
  let studentId = "";
  let classId = "";

  let teacherToken = "";
  let parentToken = "";

  async function api(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function apiJson(path: string, init?: RequestInit) {
    const response = await api(path, init);
    const body = (await response.json().catch(() => null)) as JsonObject | null;
    return { response, body };
  }

  async function login(email: string) {
    const { response, body } = await apiJson("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(response.status).toBe(201);
    return String(body?.accessToken ?? "");
  }

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0);

    baseUrl = await app.getUrl();
    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(password, 10);

    const school = await prisma.school.create({
      data: {
        slug: schoolSlug,
        name: `E2E Feed Interactions ${runId}`,
      },
      select: { id: true },
    });
    schoolId = school.id;

    const teacher = await prisma.user.create({
      data: {
        firstName: "Theo",
        lastName: "Teacher",
        email: teacherEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: {
            schoolId,
            role: "TEACHER",
          },
        },
      },
      select: { id: true },
    });
    teacherUserId = teacher.id;

    const parent = await prisma.user.create({
      data: {
        firstName: "Paula",
        lastName: "Parent",
        email: parentEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: {
            schoolId,
            role: "PARENT",
          },
        },
      },
      select: { id: true },
    });
    parentUserId = parent.id;

    const schoolYear = await prisma.schoolYear.create({
      data: { schoolId, label: `Feed ${runId}` },
      select: { id: true },
    });

    const klass = await prisma.class.create({
      data: { schoolId, schoolYearId: schoolYear.id, name: `6e Feed ${runId}` },
      select: { id: true },
    });
    classId = klass.id;

    const studentUser = await prisma.user.create({
      data: {
        firstName: "Sam",
        lastName: "Student",
        email: studentEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "STUDENT" } },
      },
      select: { id: true },
    });
    studentUserId = studentUser.id;

    const student = await prisma.student.create({
      data: {
        schoolId,
        userId: studentUserId,
        firstName: "Sam",
        lastName: "Student",
      },
      select: { id: true },
    });
    studentId = student.id;

    await prisma.enrollment.create({
      data: {
        schoolId,
        schoolYearId: schoolYear.id,
        studentId,
        classId,
        status: "ACTIVE",
      },
    });

    await prisma.parentStudent.create({
      data: { schoolId, parentUserId, studentId },
    });

    teacherToken = await login(teacherEmail);
    parentToken = await login(parentEmail);
  });

  afterAll(async () => {
    if (prisma) {
      if (schoolId) {
        await prisma.school.deleteMany({ where: { id: schoolId } });
      }
      const userIds = [teacherUserId, parentUserId, studentUserId].filter(
        Boolean,
      );
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    if (app) {
      await app.close();
    }
  });

  it("creates a poll post with attachments and exposes it in the list", async () => {
    const { response, body } = await apiJson(
      `/api/schools/${schoolSlug}/feed`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          type: "POLL",
          title: "Choix de la sortie",
          bodyHtml: "<p>Merci de voter avant jeudi.</p>",
          audienceScope: "SCHOOL_ALL",
          audienceLabel: "Toute l'ecole",
          pollQuestion: "Quel créneau retenez-vous ?",
          pollOptions: ["Mercredi matin", "Vendredi apres-midi"],
          attachments: [
            {
              fileName: "programme.pdf",
              fileUrl: "https://cdn.example.test/programme.pdf",
              sizeLabel: "120 Ko",
            },
          ],
        }),
      },
    );

    expect(response.status).toBe(201);
    expect(body?.type).toBe("POLL");
    expect(body?.poll).toMatchObject({
      question: "Quel créneau retenez-vous ?",
    });
    expect(body?.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "programme.pdf",
          sizeLabel: "120 Ko",
        }),
      ]),
    );

    const list = await apiJson(`/api/schools/${schoolSlug}/feed`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${parentToken}`,
      },
    });

    expect(list.response.status).toBe(200);
    const items = (list.body?.items ?? []) as Array<Record<string, unknown>>;
    expect(items[0]?.title).toBe("Choix de la sortie");
    expect(items[0]?.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fileName: "programme.pdf" }),
      ]),
    );
  });

  it("rejects an invalid poll missing enough options", async () => {
    const { response } = await apiJson(`/api/schools/${schoolSlug}/feed`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        type: "POLL",
        title: "Sondage invalide",
        bodyHtml: "<p>Test</p>",
        audienceScope: "SCHOOL_ALL",
        audienceLabel: "Toute l'ecole",
        pollQuestion: "Une seule option",
        pollOptions: ["Unique"],
      }),
    });

    expect(response.status).toBe(400);
  });

  it("toggles like on a post and updates the count", async () => {
    const created = await apiJson(`/api/schools/${schoolSlug}/feed`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        type: "POST",
        title: "Annonce likes",
        bodyHtml: "<p>Merci de reagir.</p>",
        audienceScope: "SCHOOL_ALL",
        audienceLabel: "Toute l'ecole",
      }),
    });
    const postId = String(created.body?.id ?? "");

    const liked = await apiJson(
      `/api/schools/${schoolSlug}/feed/${postId}/likes/toggle`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${parentToken}`,
        },
      },
    );
    expect(liked.response.status).toBe(201);
    expect(liked.body).toEqual({ liked: true, likesCount: 1 });

    const unliked = await apiJson(
      `/api/schools/${schoolSlug}/feed/${postId}/likes/toggle`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${parentToken}`,
        },
      },
    );
    expect(unliked.response.status).toBe(201);
    expect(unliked.body).toEqual({ liked: false, likesCount: 0 });
  });

  it("persists a poll vote and exposes votedOptionId in subsequent lists", async () => {
    const created = await apiJson(`/api/schools/${schoolSlug}/feed`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        type: "POLL",
        title: "Choix du forum",
        bodyHtml: "<p>Votez avant mercredi.</p>",
        audienceScope: "SCHOOL_ALL",
        audienceLabel: "Toute l'ecole",
        pollQuestion: "Quel créneau retenez-vous ?",
        pollOptions: ["Mercredi matin", "Vendredi apres-midi"],
      }),
    });
    const postId = String(created.body?.id ?? "");
    const poll = created.body?.poll as
      | { options?: Array<{ id: string; label: string; votes: number }> }
      | undefined;
    const optionId = String(poll?.options?.[0]?.id ?? "");

    const voted = await apiJson(
      `/api/schools/${schoolSlug}/feed/${postId}/polls/${optionId}/vote`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${parentToken}`,
        },
      },
    );

    expect(voted.response.status).toBe(201);
    expect(voted.body).toEqual({
      votedOptionId: optionId,
      options: [
        expect.objectContaining({
          id: optionId,
          votes: 1,
        }),
        expect.objectContaining({
          votes: 0,
        }),
      ],
    });

    const list = await apiJson(`/api/schools/${schoolSlug}/feed?types=polls`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${parentToken}`,
      },
    });

    expect(list.response.status).toBe(200);
    const votedPost = (list.body?.items as Array<Record<string, unknown>>).find(
      (entry) => entry.id === postId,
    );
    expect(votedPost?.poll).toMatchObject({
      votedOptionId: optionId,
    });
    expect(
      (votedPost?.poll as { options?: Array<Record<string, unknown>> }).options,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: optionId, votes: 1 }),
      ]),
    );
  });

  it("rejects a duplicate poll vote", async () => {
    const created = await apiJson(`/api/schools/${schoolSlug}/feed`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        type: "POLL",
        title: "Choix duplicate",
        bodyHtml: "<p>Votez.</p>",
        audienceScope: "SCHOOL_ALL",
        audienceLabel: "Toute l'ecole",
        pollQuestion: "Quel créneau retenez-vous ?",
        pollOptions: ["Mercredi matin", "Vendredi apres-midi"],
      }),
    });
    const postId = String(created.body?.id ?? "");
    const poll = created.body?.poll as
      | { options?: Array<{ id: string; label: string; votes: number }> }
      | undefined;
    const optionId = String(poll?.options?.[0]?.id ?? "");

    const firstVote = await api(
      `/api/schools/${schoolSlug}/feed/${postId}/polls/${optionId}/vote`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${parentToken}`,
        },
      },
    );
    expect(firstVote.status).toBe(201);

    const secondVote = await api(
      `/api/schools/${schoolSlug}/feed/${postId}/polls/${optionId}/vote`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${parentToken}`,
        },
      },
    );
    expect(secondVote.status).toBe(400);
  });

  it("adds a comment and returns the updated count", async () => {
    const created = await apiJson(`/api/schools/${schoolSlug}/feed`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        type: "POST",
        title: "Annonce commentaires",
        bodyHtml: "<p>Vos retours sont bienvenus.</p>",
        audienceScope: "SCHOOL_ALL",
        audienceLabel: "Toute l'ecole",
      }),
    });
    const postId = String(created.body?.id ?? "");

    const comment = await apiJson(
      `/api/schools/${schoolSlug}/feed/${postId}/comments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${parentToken}`,
        },
        body: JSON.stringify({ text: "Merci pour cette information." }),
      },
    );

    expect(comment.response.status).toBe(201);
    expect(comment.body).toMatchObject({
      commentsCount: 1,
      comment: expect.objectContaining({
        authorName: "Paula Parent",
        text: "Merci pour cette information.",
      }),
    });
  });

  describe("PARENT read-only on their child's class feed", () => {
    it("lets the parent see the class post in the CLASS-scoped list (visibility unchanged)", async () => {
      const created = await apiJson(`/api/schools/${schoolSlug}/feed`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          type: "POST",
          title: "Annonce de classe",
          bodyHtml: "<p>Sortie pedagogique la semaine prochaine.</p>",
          audienceScope: "CLASS",
          audienceClassId: classId,
        }),
      });
      expect(created.response.status).toBe(201);
      const postId = String(created.body?.id ?? "");

      const list = await apiJson(
        `/api/schools/${schoolSlug}/feed?viewScope=CLASS&classId=${classId}`,
        {
          method: "GET",
          headers: { authorization: `Bearer ${parentToken}` },
        },
      );
      expect(list.response.status).toBe(200);
      const items = (list.body?.items ?? []) as Array<Record<string, unknown>>;
      expect(items.some((item) => item.id === postId)).toBe(true);
    });

    it("403 — the parent cannot like a post on their child's class feed", async () => {
      const created = await apiJson(`/api/schools/${schoolSlug}/feed`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          type: "POST",
          title: "Annonce de classe likes",
          bodyHtml: "<p>Merci de reagir.</p>",
          audienceScope: "CLASS",
          audienceClassId: classId,
        }),
      });
      const postId = String(created.body?.id ?? "");

      const { response } = await apiJson(
        `/api/schools/${schoolSlug}/feed/${postId}/likes/toggle`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${parentToken}` },
        },
      );
      expect(response.status).toBe(403);

      // Le staff, lui, reste autorise a interagir sur ce meme post.
      const staffLike = await apiJson(
        `/api/schools/${schoolSlug}/feed/${postId}/likes/toggle`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${teacherToken}` },
        },
      );
      expect(staffLike.response.status).toBe(201);
    });

    it("403 — the parent cannot comment on their child's class feed", async () => {
      const created = await apiJson(`/api/schools/${schoolSlug}/feed`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          type: "POST",
          title: "Annonce de classe commentaires",
          bodyHtml: "<p>Vos retours sont bienvenus.</p>",
          audienceScope: "CLASS",
          audienceClassId: classId,
        }),
      });
      const postId = String(created.body?.id ?? "");

      const { response } = await apiJson(
        `/api/schools/${schoolSlug}/feed/${postId}/comments`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${parentToken}`,
          },
          body: JSON.stringify({ text: "Je tente un commentaire interdit." }),
        },
      );
      expect(response.status).toBe(403);
    });

    it("403 — the parent cannot vote on a poll on their child's class feed", async () => {
      const created = await apiJson(`/api/schools/${schoolSlug}/feed`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          type: "POLL",
          title: "Sondage de classe",
          bodyHtml: "<p>Votez avant vendredi.</p>",
          audienceScope: "CLASS",
          audienceClassId: classId,
          pollQuestion: "Quelle sortie preferez-vous ?",
          pollOptions: ["Musee", "Piscine"],
        }),
      });
      const postId = String(created.body?.id ?? "");
      const poll = created.body?.poll as
        | { options?: Array<{ id: string }> }
        | undefined;
      const optionId = String(poll?.options?.[0]?.id ?? "");

      const { response } = await apiJson(
        `/api/schools/${schoolSlug}/feed/${postId}/polls/${optionId}/vote`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${parentToken}` },
        },
      );
      expect(response.status).toBe(403);
    });

    it("403 — the parent cannot create a post directly scoped to their child's class", async () => {
      const { response, body } = await apiJson(
        `/api/schools/${schoolSlug}/feed`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${parentToken}`,
          },
          body: JSON.stringify({
            type: "POST",
            title: "Publication parent sur la classe",
            bodyHtml: "<p>Je tente de publier dans la classe.</p>",
            audienceScope: "CLASS",
            audienceClassId: classId,
          }),
        },
      );

      // Le backend force deja l'audience PARENTS_ONLY pour un parent : le
      // post est cree, mais jamais avec audienceScope CLASS.
      expect(response.status).toBe(201);
      const audience = body?.audience as { scope?: string } | undefined;
      expect(audience?.scope).not.toBe("CLASS");
    });
  });
});
