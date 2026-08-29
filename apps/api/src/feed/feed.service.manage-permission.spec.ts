import { ForbiddenException } from "@nestjs/common";
import { FeedService } from "./feed.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { MediaClientService } from "../media-client/media-client.service.js";
import type { InlineMediaService } from "../media/inline-media.service.js";

/**
 * Régression : un compte cumulant plusieurs memberships dans la même école
 * (ex. PARENT + TEACHER, cas réel observé en production — un utilisateur
 * test rattaché comme parent ET comme enseignant/staff au même
 * établissement) pouvait supprimer le post d'un autre parent/élève en
 * naviguant en "vue enfant" (rôle actif PARENT), parce que
 * `resolveViewerContext` calculait `isStaff` à partir de TOUS les
 * memberships de l'école plutôt que du rôle actuellement actif
 * (`user.activeRole`) — même anti-pattern déjà corrigé dans Resources et
 * Tickets (voir CLAUDE.md, section "Rôle actif").
 *
 * Le fix fait de `resolveActiveRole(user.activeRole, ...)` la seule source
 * de vérité pour isStaff/isParent/isStudent dans ce service.
 */

function makeUser(
  id: string,
  schoolId: string,
  memberships: Array<{ role: AuthenticatedUser["memberships"][number]["role"] }>,
  activeRole: AuthenticatedUser["activeRole"] = null,
): AuthenticatedUser {
  return {
    id,
    platformRoles: [],
    memberships: memberships.map((m) => ({ ...m, schoolId })),
    profileCompleted: true,
    firstName: "Test",
    lastName: "User",
    activeRole,
  };
}

function makeExistingPost(authorUserId: string, authorRole: string) {
  return {
    id: "post-1",
    authorUserId,
    type: "TEXT",
    bodyHtml: "<p>hello</p>",
    attachments: [],
    authorUser: {
      memberships: [{ role: authorRole }],
    },
  };
}

function makePrismaMock(input: {
  schoolId: string;
  post: ReturnType<typeof makeExistingPost>;
}) {
  return {
    school: {
      findUnique: jest.fn().mockResolvedValue({ activeSchoolYearId: "sy-1" }),
    },
    enrollment: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    teacherClassSubject: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    feedPost: {
      findFirst: jest.fn().mockResolvedValue(input.post),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    $transaction: jest.fn().mockImplementation((ops: unknown[]) => {
      return Promise.all(ops as Promise<unknown>[]);
    }),
  };
}

function makeService(prisma: ReturnType<typeof makePrismaMock>) {
  const inlineMediaService = {
    removeEntityImages: jest.fn().mockResolvedValue(undefined),
  };
  return new FeedService(
    prisma as unknown as PrismaService,
    {} as unknown as MediaClientService,
    inlineMediaService as unknown as InlineMediaService,
  );
}

describe("FeedService.deletePost — permission basée sur le rôle actif", () => {
  const schoolId = "school-1";

  it("refuse à un compte PARENT+TEACHER, actuellement actif en PARENT, de supprimer le post d'un autre parent", async () => {
    const post = makeExistingPost("other-parent-user", "PARENT");
    const prisma = makePrismaMock({ schoolId, post });
    const service = makeService(prisma);
    const viewer = makeUser(
      "viewer-1",
      schoolId,
      [{ role: "PARENT" }, { role: "TEACHER" }],
      "PARENT",
    );

    await expect(
      service.deletePost(viewer, schoolId, "post-1"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("autorise le même compte, actif en TEACHER (staff), à modérer le post d'un parent", async () => {
    const post = makeExistingPost("other-parent-user", "PARENT");
    const prisma = makePrismaMock({ schoolId, post });
    const service = makeService(prisma);
    const viewer = makeUser(
      "viewer-1",
      schoolId,
      [{ role: "PARENT" }, { role: "TEACHER" }],
      "TEACHER",
    );

    await expect(
      service.deletePost(viewer, schoolId, "post-1"),
    ).resolves.toEqual({ success: true, postId: "post-1" });
  });

  it("autorise toujours l'auteur à supprimer son propre post, quel que soit le rôle actif", async () => {
    const post = makeExistingPost("viewer-1", "PARENT");
    const prisma = makePrismaMock({ schoolId, post });
    const service = makeService(prisma);
    const viewer = makeUser(
      "viewer-1",
      schoolId,
      [{ role: "PARENT" }, { role: "TEACHER" }],
      "PARENT",
    );

    await expect(
      service.deletePost(viewer, schoolId, "post-1"),
    ).resolves.toEqual({ success: true, postId: "post-1" });
  });

  it("compte mono-rôle sans activeRole persisté (fallback) : un simple parent ne peut pas supprimer le post d'un autre", async () => {
    const post = makeExistingPost("other-parent-user", "PARENT");
    const prisma = makePrismaMock({ schoolId, post });
    const service = makeService(prisma);
    const viewer = makeUser("viewer-1", schoolId, [{ role: "PARENT" }], null);

    await expect(
      service.deletePost(viewer, schoolId, "post-1"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("compte mono-rôle STAFF sans activeRole persisté (fallback) : peut modérer un post PARENT/STUDENT", async () => {
    const post = makeExistingPost("other-parent-user", "PARENT");
    const prisma = makePrismaMock({ schoolId, post });
    const service = makeService(prisma);
    const viewer = makeUser("viewer-1", schoolId, [{ role: "TEACHER" }], null);

    await expect(
      service.deletePost(viewer, schoolId, "post-1"),
    ).resolves.toEqual({ success: true, postId: "post-1" });
  });
});
