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
    votePoll: jest.fn(),
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

  it("translates the missing image file message based on preferredLocale", async () => {
    await expect(
      controller.uploadInlineImage(user, "school-1", undefined),
    ).rejects.toThrow("Fichier image manquant.");

    const enUser = { ...user, preferredLocale: "EN" as const };
    await expect(
      controller.uploadInlineImage(enUser, "school-1", undefined),
    ).rejects.toThrow("Missing image file.");
  });

  it.each(["png", "jpg", "jpeg", "webp", "gif", "heic"])(
    "delegates attachment upload to mediaClientService with the feed-attachment kind for .%s images",
    async (ext) => {
      const file = { buffer: Buffer.from("data"), mimetype: `image/${ext}`, size: 10 };
      mediaClientService.uploadImage.mockResolvedValue({
        url: `https://cdn.example.com/feed/photo.${ext}`,
        size: 10,
        width: null,
        height: null,
        mimeType: `image/${ext}`,
      });

      const result = await controller.uploadAttachment(file);

      expect(mediaClientService.uploadImage).toHaveBeenCalledWith(
        "feed-attachment",
        file,
      );
      expect(result.url).toContain(`photo.${ext}`);
    },
  );

  it("delegates likes and comments to service", async () => {
    await controller.toggleLike(user, "school-1", "post-1");
    expect(feedService.toggleLike).toHaveBeenCalledWith(
      user,
      "school-1",
      "post-1",
    );

    const payload = { text: "Merci pour l'information" };
    await controller.comment(user, "school-1", "post-1", payload);
    expect(feedService.addComment).toHaveBeenCalledWith(
      user,
      "school-1",
      "post-1",
      payload,
    );

    await controller.votePoll(user, "school-1", "post-1", "option-1");
    expect(feedService.votePoll).toHaveBeenCalledWith(
      user,
      "school-1",
      "post-1",
      "option-1",
    );
  });
});
