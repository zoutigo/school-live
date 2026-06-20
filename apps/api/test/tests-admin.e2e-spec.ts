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

// Les campagnes/cas de test sont globaux à l'application : un testeur les voit quel que
// soit son école active, et seul SUPER_ADMIN/ADMIN peut les piloter (cf. plan
// cosmic-enchanting-flamingo). Ce spec couvre la régression du bug "tests propres à
// l'école" et l'accès admin/tests réservé à SUPER_ADMIN/ADMIN.
describe("Tests admin API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const superAdminPhone = `+336${String(
    Math.floor(Math.random() * 1e8),
  ).padStart(8, "0")}`;
  const password = "StrongPass1";
  const superAdminEmail = `e2e-tests-superadmin-${runId}@example.test`;
  const schoolAdminEmail = `e2e-tests-schooladmin-${runId}@example.test`;
  const testerEmail = `e2e-tests-tester-${runId}@example.test`;
  const schoolSlug = `e2e-tests-school-${runId}`;

  let schoolId = "";
  let testerUserId = "";
  let superAdminToken = "";
  let schoolAdminToken = "";
  let testerToken = "";

  let campaignId = "";
  let campaignReference = 0;
  let testCaseId = "";
  let executionId = "";

  async function api(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function apiJson(path: string, init?: RequestInit) {
    const response = await api(path, init);
    const body = (await response.json().catch(() => null)) as JsonObject | null;
    return { response, body };
  }

  function authHeaders(token: string) {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    };
  }

  async function login(email: string) {
    const { response, body } = await apiJson("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(response.status).toBe(201);
    return String((body as { accessToken: string }).accessToken);
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
      data: { slug: schoolSlug, name: `E2E Tests School ${runId}` },
      select: { id: true },
    });
    schoolId = school.id;

    const pinHash = await bcrypt.hash("123456", 10);
    await prisma.user.create({
      data: {
        firstName: "Super",
        lastName: "Admin",
        email: superAdminEmail,
        phone: superAdminPhone,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        platformRoles: { create: [{ role: "SUPER_ADMIN" }] },
        phoneCredential: {
          create: {
            phoneE164: superAdminPhone,
            pinHash,
            verifiedAt: new Date(),
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        firstName: "School",
        lastName: "Admin",
        email: schoolAdminEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "SCHOOL_ADMIN" } },
      },
    });

    const tester = await prisma.user.create({
      data: {
        firstName: "Parent",
        lastName: "Testeur",
        email: testerEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        isTester: true,
        memberships: { create: { schoolId, role: "PARENT" } },
      },
      select: { id: true },
    });
    testerUserId = tester.id;

    superAdminToken = await login(superAdminEmail);
    schoolAdminToken = await login(schoolAdminEmail);
    testerToken = await login(testerEmail);
  });

  afterAll(async () => {
    if (prisma) {
      if (campaignId) {
        await prisma.testCampaign
          .delete({ where: { id: campaignId } })
          .catch(() => {});
      }
      if (schoolId) {
        await prisma.school.delete({ where: { id: schoolId } }).catch(() => {});
      }
      await prisma.user.deleteMany({
        where: { email: { startsWith: "e2e-tests-" } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  it("rejects SCHOOL_ADMIN from the admin tests routes (global pilotage, not school-scoped)", async () => {
    const { response } = await apiJson("/api/admin/tests/campaigns", {
      headers: authHeaders(schoolAdminToken),
    });
    expect(response.status).toBe(403);
  });

  it("lets SUPER_ADMIN create a global campaign and a test case targeted at PARENT testers", async () => {
    const { response, body } = await apiJson("/api/admin/tests/campaigns", {
      method: "POST",
      headers: authHeaders(superAdminToken),
      body: JSON.stringify({
        title: `Campagne e2e ${runId}`,
        status: "ACTIVE",
      }),
    });
    expect(response.status).toBe(201);
    campaignId = String((body as { id: string }).id);
    campaignReference = Number((body as { reference: number }).reference);
    expect(campaignReference).toBeGreaterThan(0);

    const caseResult = await apiJson(
      `/api/admin/tests/campaigns/${campaignId}/cases`,
      {
        method: "POST",
        headers: authHeaders(superAdminToken),
        body: JSON.stringify({
          title: "Cas e2e",
          expectedResult: "Tout fonctionne",
          audienceRoles: ["PARENT"],
        }),
      },
    );
    expect(caseResult.response.status).toBe(201);
    testCaseId = String((caseResult.body as { id: string }).id);
  });

  it("shows the campaign to a PARENT tester through the global /tests routes, with no school scoping at all", async () => {
    const { response, body } = await apiJson("/api/tests/campaigns", {
      headers: authHeaders(testerToken),
    });
    expect(response.status).toBe(200);
    const campaigns = body as unknown as Array<{ id: string }>;
    expect(campaigns.some((campaign) => campaign.id === campaignId)).toBe(true);
  });

  it("lets SUPER_ADMIN search the global campaign list by its numeric reference", async () => {
    const { response, body } = await apiJson(
      `/api/admin/tests/campaigns?search=${campaignReference}`,
      { headers: authHeaders(superAdminToken) },
    );
    expect(response.status).toBe(200);
    const result = body as { items: Array<{ id: string }> };
    expect(result.items.some((item) => item.id === campaignId)).toBe(true);
  });

  it("lets SUPER_ADMIN recycle a test case without deleting its execution history", async () => {
    const execution = await apiJson(
      `/api/tests/cases/${testCaseId}/executions`,
      {
        method: "POST",
        headers: authHeaders(testerToken),
        body: JSON.stringify({ status: "PASSED", resultText: "OK" }),
      },
    );
    expect(execution.response.status).toBe(201);
    executionId = String((execution.body as { id: string }).id);

    const recycle = await apiJson(
      `/api/admin/tests/cases/${testCaseId}/recycle`,
      { method: "POST", headers: authHeaders(superAdminToken) },
    );
    expect(recycle.response.status).toBe(201);
    expect((recycle.body as { recycledAt: string }).recycledAt).toBeTruthy();

    const detail = await apiJson(`/api/tests/cases/${testCaseId}`, {
      headers: authHeaders(testerToken),
    });
    expect(detail.response.status).toBe(200);
    expect(
      (detail.body as { latestOwnExecution: unknown }).latestOwnExecution,
    ).toBeNull();
    expect(
      (detail.body as { executions: unknown[] }).executions.length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("lets SUPER_ADMIN assign the campaign to the tester as a priority", async () => {
    const assign = await apiJson(
      `/api/admin/tests/campaigns/${campaignId}/assignments`,
      {
        method: "POST",
        headers: authHeaders(superAdminToken),
        body: JSON.stringify({ testerId: testerUserId, note: "Priorité v1" }),
      },
    );
    expect(assign.response.status).toBe(201);

    const list = await apiJson(
      `/api/admin/tests/campaigns/${campaignId}/assignments`,
      { headers: authHeaders(superAdminToken) },
    );
    expect(list.response.status).toBe(200);
    const assignments = list.body as unknown as Array<{
      user: { id: string };
    }>;
    expect(assignments.some((entry) => entry.user.id === testerUserId)).toBe(
      true,
    );
  });

  it("includes the tester in the global testers list and synthesis", async () => {
    const testers = await apiJson("/api/admin/tests/testers", {
      headers: authHeaders(superAdminToken),
    });
    expect(testers.response.status).toBe(200);
    const result = testers.body as { items: Array<{ id: string }> };
    expect(result.items.some((item) => item.id === testerUserId)).toBe(true);

    const synthesis = await apiJson("/api/admin/tests/synthesis", {
      headers: authHeaders(superAdminToken),
    });
    expect(synthesis.response.status).toBe(200);
    expect(
      (synthesis.body as { campaigns: { total: number } }).campaigns.total,
    ).toBeGreaterThanOrEqual(1);
  });

  it("lets the tester list and open their own past executions", async () => {
    const list = await apiJson("/api/tests/executions", {
      headers: authHeaders(testerToken),
    });
    expect(list.response.status).toBe(200);
    const items = (list.body as { items: Array<{ id: string }> }).items;
    expect(items.some((item) => item.id === executionId)).toBe(true);

    const detail = await apiJson(`/api/tests/executions/${executionId}`, {
      headers: authHeaders(testerToken),
    });
    expect(detail.response.status).toBe(200);
    expect((detail.body as { id: string }).id).toBe(executionId);
  });

  it("rejects SCHOOL_ADMIN from the admin executions routes (global pilotage, not school-scoped)", async () => {
    const { response } = await apiJson("/api/admin/tests/executions", {
      headers: authHeaders(schoolAdminToken),
    });
    expect(response.status).toBe(403);
  });

  it("lets SUPER_ADMIN list, open and review a tester's execution", async () => {
    const list = await apiJson(
      `/api/admin/tests/executions?campaignId=${campaignId}`,
      { headers: authHeaders(superAdminToken) },
    );
    expect(list.response.status).toBe(200);
    const items = (list.body as { items: Array<{ id: string }> }).items;
    expect(items.some((item) => item.id === executionId)).toBe(true);

    const detail = await apiJson(`/api/admin/tests/executions/${executionId}`, {
      headers: authHeaders(superAdminToken),
    });
    expect(detail.response.status).toBe(200);

    const review = await apiJson(
      `/api/admin/tests/executions/${executionId}/review`,
      {
        method: "PATCH",
        headers: authHeaders(superAdminToken),
        body: JSON.stringify({ reviewed: true, note: "Vérifié, OK" }),
      },
    );
    expect(review.response.status).toBe(200);
    expect(
      (review.body as { adminReviewedAt: string | null }).adminReviewedAt,
    ).toBeTruthy();
    expect((review.body as { adminReviewNote: string }).adminReviewNote).toBe(
      "Vérifié, OK",
    );
  });

  it("returns 404 for an unknown execution id", async () => {
    const { response } = await apiJson(
      "/api/admin/tests/executions/does-not-exist",
      { headers: authHeaders(superAdminToken) },
    );
    expect(response.status).toBe(404);
  });

  it("lets SUPER_ADMIN update the campaign and the test case", async () => {
    const updateCampaign = await apiJson(
      `/api/admin/tests/campaigns/${campaignId}`,
      {
        method: "PATCH",
        headers: authHeaders(superAdminToken),
        body: JSON.stringify({
          title: `Campagne e2e ${runId} modifiée`,
          status: "ARCHIVED",
        }),
      },
    );
    expect(updateCampaign.response.status).toBe(200);
    expect((updateCampaign.body as { status: string }).status).toBe("ARCHIVED");

    const updateCase = await apiJson(`/api/admin/tests/cases/${testCaseId}`, {
      method: "PATCH",
      headers: authHeaders(superAdminToken),
      body: JSON.stringify({
        title: "Cas e2e modifié",
        priority: "HIGH",
        evidenceRequired: true,
      }),
    });
    expect(updateCase.response.status).toBe(200);
    expect((updateCase.body as { priority: string }).priority).toBe("HIGH");

    const detail = await apiJson(`/api/admin/tests/campaigns/${campaignId}`, {
      headers: authHeaders(superAdminToken),
    });
    expect(detail.response.status).toBe(200);
    expect((detail.body as { title: string }).title).toBe(
      `Campagne e2e ${runId} modifiée`,
    );
  });

  it("returns 404 when updating a campaign or test case that does not exist", async () => {
    const campaignResult = await apiJson(
      "/api/admin/tests/campaigns/does-not-exist",
      {
        method: "PATCH",
        headers: authHeaders(superAdminToken),
        body: JSON.stringify({ title: "x" }),
      },
    );
    expect(campaignResult.response.status).toBe(404);

    const caseResult = await apiJson("/api/admin/tests/cases/does-not-exist", {
      method: "PATCH",
      headers: authHeaders(superAdminToken),
      body: JSON.stringify({ title: "x" }),
    });
    expect(caseResult.response.status).toBe(404);
  });

  it("lets SUPER_ADMIN delete a test case it created", async () => {
    const disposable = await apiJson(
      `/api/admin/tests/campaigns/${campaignId}/cases`,
      {
        method: "POST",
        headers: authHeaders(superAdminToken),
        body: JSON.stringify({
          title: "Cas jetable e2e",
          expectedResult: "Peu importe",
        }),
      },
    );
    expect(disposable.response.status).toBe(201);
    const disposableId = String((disposable.body as { id: string }).id);

    const deleteResult = await apiJson(
      `/api/admin/tests/cases/${disposableId}`,
      { method: "DELETE", headers: authHeaders(superAdminToken) },
    );
    expect(deleteResult.response.status).toBe(200);

    const detail = await apiJson(`/api/admin/tests/campaigns/${campaignId}`, {
      headers: authHeaders(superAdminToken),
    });
    const cases = (detail.body as { testCases: Array<{ id: string }> })
      .testCases;
    expect(cases.some((item) => item.id === disposableId)).toBe(false);
  });

  it("lets SUPER_ADMIN delete the campaign, cascading its test cases", async () => {
    const deleteResult = await apiJson(
      `/api/admin/tests/campaigns/${campaignId}`,
      { method: "DELETE", headers: authHeaders(superAdminToken) },
    );
    expect(deleteResult.response.status).toBe(200);

    const detail = await apiJson(`/api/admin/tests/campaigns/${campaignId}`, {
      headers: authHeaders(superAdminToken),
    });
    expect(detail.response.status).toBe(404);

    campaignId = "";
  });
});
