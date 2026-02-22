import { BadRequestException } from "@nestjs/common";
import { FeedController } from "../src/feed/feed.controller";

describe("FeedController", () => {
  const feedService = {
    listPosts: jest.fn(),
    createPost: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
    toggleLike: jest.fn(),
    addComment: jest.fn(),
  };

  const mediaClientService = {
    uploadImage: jest.fn(),
  };
  const inlineMediaService = {
    registerTempUpload: jest.fn(),
  };

  const controller = new FeedController(
    feedService as never,
    mediaClientService as never,
    inlineMediaService as never,
  );

  const user = {
    id: "u-1",
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" as const }],
    profileCompleted: true,
    firstName: "Anne",
    lastName: "Admin",
  };

  beforeEach(() => {
    Object.values(feedService).forEach((fn) => fn.mockReset());
    mediaClientService.uploadImage.mockReset();
    inlineMediaService.registerTempUpload.mockReset();
  });

  it("delegates update and delete to service", async () => {
    const payload = {
      title: "Titre modifie",
      bodyHtml: "<p>Contenu</p>",
    };

    await controller.update(user, "school-1", "post-1", payload);
    expect(feedService.updatePost).toHaveBeenCalledWith(
      user,
      "school-1",
      "post-1",
      payload,
    );

    await controller.remove(user, "school-1", "post-1");
    expect(feedService.deletePost).toHaveBeenCalledWith(
      user,
      "school-1",
      "post-1",
    );
  });

  it("throws when inline image file is missing", async () => {
    await expect(
      controller.uploadInlineImage(user, "school-1", undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
