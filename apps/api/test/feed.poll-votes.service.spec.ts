import { BadRequestException } from "@nestjs/common";
import { FeedService } from "../src/feed/feed.service";

describe("FeedService poll votes", () => {
  const prisma = {
    school: {
      findUnique: jest.fn(),
    },
    enrollment: {
      findMany: jest.fn(),
    },
    teacherClassSubject: {
      findMany: jest.fn(),
    },
    feedPost: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    feedPollVote: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const service = new FeedService(
    prisma as never,
    { deleteImageByUrl: jest.fn() } as never,
    { syncEntityImages: jest.fn(), removeEntityImages: jest.fn() } as never,
  );

  const schoolId = "school-1";
  const viewer = {
    id: "parent-1",
    platformRoles: [],
    memberships: [{ schoolId, role: "PARENT" as const }],
    profileCompleted: true,
    firstName: "Paula",
    lastName: "Parent",
  };

  beforeEach(() => {
    prisma.school.findUnique.mockReset();
    prisma.enrollment.findMany.mockReset();
    prisma.teacherClassSubject.findMany.mockReset();
    prisma.feedPost.findFirst.mockReset();
    prisma.feedPost.update.mockReset();
    prisma.feedPollVote.findUnique.mockReset();
    prisma.feedPollVote.create.mockReset();
    prisma.$transaction.mockReset();

    prisma.school.findUnique.mockResolvedValue({ activeSchoolYearId: null });
    prisma.enrollment.findMany.mockResolvedValue([]);
    prisma.teacherClassSubject.findMany.mockResolvedValue([]);

    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === "function") {
        return arg({
          feedPost: {
            findFirst: prisma.feedPost.findFirst,
            update: prisma.feedPost.update,
          },
          feedPollVote: {
            findUnique: prisma.feedPollVote.findUnique,
            create: prisma.feedPollVote.create,
          },
        });
      }
      return Promise.all(arg as Array<Promise<unknown>>);
    });
  });

  it("persists the first vote and returns updated poll data", async () => {
    prisma.feedPost.findFirst
      .mockResolvedValueOnce({
        id: "post-1",
        audienceScope: "SCHOOL_ALL",
        audienceClassId: null,
        audienceLevelId: null,
      })
      .mockResolvedValueOnce({
        id: "post-1",
        type: "POLL",
        pollQuestion: "Quel créneau ?",
        pollOptionsJson: [
          { id: "opt-1", label: "Mercredi", votes: 4 },
          { id: "opt-2", label: "Vendredi", votes: 3 },
        ],
      });
    prisma.feedPollVote.findUnique.mockResolvedValue(null);
    prisma.feedPost.update.mockResolvedValue({});
    prisma.feedPollVote.create.mockResolvedValue({});

    const result = await service.votePoll(viewer, schoolId, "post-1", "opt-1");

    expect(prisma.feedPost.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: {
        pollOptionsJson: [
          { id: "opt-1", label: "Mercredi", votes: 5 },
          { id: "opt-2", label: "Vendredi", votes: 3 },
        ],
      },
    });
    expect(prisma.feedPollVote.create).toHaveBeenCalledWith({
      data: {
        postId: "post-1",
        schoolId,
        userId: "parent-1",
        optionId: "opt-1",
      },
    });
    expect(result).toEqual({
      votedOptionId: "opt-1",
      options: [
        { id: "opt-1", label: "Mercredi", votes: 5 },
        { id: "opt-2", label: "Vendredi", votes: 3 },
      ],
    });
  });

  it("rejects a second vote on the same poll", async () => {
    prisma.feedPost.findFirst
      .mockResolvedValueOnce({
        id: "post-1",
        audienceScope: "SCHOOL_ALL",
        audienceClassId: null,
        audienceLevelId: null,
      })
      .mockResolvedValueOnce({
        id: "post-1",
        type: "POLL",
        pollQuestion: "Quel créneau ?",
        pollOptionsJson: [
          { id: "opt-1", label: "Mercredi", votes: 4 },
          { id: "opt-2", label: "Vendredi", votes: 3 },
        ],
      });
    prisma.feedPollVote.findUnique.mockResolvedValue({ id: "vote-1" });

    await expect(
      service.votePoll(viewer, schoolId, "post-1", "opt-2"),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.feedPost.update).not.toHaveBeenCalled();
    expect(prisma.feedPollVote.create).not.toHaveBeenCalled();
  });
});
