import { ForbiddenException } from "@nestjs/common";
import { FeedService } from "./feed.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { MediaClientService } from "../media-client/media-client.service.js";
import type { InlineMediaService } from "../media/inline-media.service.js";

function makeStudentUser(id: string, schoolId: string): AuthenticatedUser {
  return {
    id,
    platformRoles: [],
    memberships: [{ schoolId, role: "STUDENT" }],
    profileCompleted: true,
    firstName: "Eleve",
    lastName: "Test",
  };
}

function makePost(id: string) {
  return {
    id,
    type: "TEXT",
    title: "",
    bodyHtml: "<p>hello</p>",
    createdAt: new Date(),
    featuredUntil: null,
    audienceScope: "CLASS",
    audienceLabel: "",
    audienceLevelId: null,
    audienceClassId: "class-1",
    pollQuestion: null,
    pollOptionsJson: null,
    authorUser: {
      id: "author-1",
      firstName: "Author",
      lastName: "Test",
      memberships: [{ role: "TEACHER" }],
    },
    attachments: [],
    comments: [],
    likes: [],
    pollVotes: [],
    _count: { likes: 0, comments: 0 },
  };
}

function makePrismaMock(input: {
  ownClassId: string;
  posts?: ReturnType<typeof makePost>[];
}) {
  const studentEnrollments = [
    { classId: input.ownClassId, class: { academicLevelId: "level-1" } },
  ];

  return {
    school: {
      findUnique: jest.fn().mockResolvedValue({ activeSchoolYearId: "sy-1" }),
    },
    enrollment: {
      findMany: jest
        .fn()
        // 1st call = studentEnrollments, 2nd = parentEnrollments
        .mockResolvedValueOnce(studentEnrollments)
        .mockResolvedValueOnce([]),
    },
    teacherClassSubject: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    feedPost: {
      count: jest.fn().mockResolvedValue((input.posts ?? []).length),
      findMany: jest.fn().mockResolvedValue(input.posts ?? []),
    },
    $transaction: jest.fn().mockImplementation((ops: unknown[]) => {
      // Both resolveViewerContext's transaction and the final count/findMany
      // transaction are plain arrays of already-invoked promises here.
      return Promise.all(ops as Promise<unknown>[]);
    }),
  };
}

describe("FeedService.listPosts — STUDENT class-scope ownership", () => {
  function makeService(prisma: ReturnType<typeof makePrismaMock>) {
    return new FeedService(
      prisma as unknown as PrismaService,
      {} as unknown as MediaClientService,
      {} as unknown as InlineMediaService,
    );
  }

  it("allows a STUDENT to read their own class feed", async () => {
    const prisma = makePrismaMock({
      ownClassId: "class-1",
      posts: [makePost("p1")],
    });
    const service = makeService(prisma);
    const user = makeStudentUser("user-1", "school-1");

    const result = await service.listPosts(user, "school-1", {
      viewScope: "CLASS",
      classId: "class-1",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("p1");
  });

  it("forbids a STUDENT from reading another class's feed", async () => {
    const prisma = makePrismaMock({ ownClassId: "class-1" });
    const service = makeService(prisma);
    const user = makeStudentUser("user-1", "school-1");

    await expect(
      service.listPosts(user, "school-1", {
        viewScope: "CLASS",
        classId: "class-2",
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
