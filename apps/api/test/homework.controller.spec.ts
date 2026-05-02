import { BadRequestException } from "@nestjs/common";
import { HomeworkController } from "../src/homework/homework.controller";

describe("HomeworkController", () => {
  const homeworkService = {
    listClassHomework: jest.fn(),
    getHomeworkDetail: jest.fn(),
    createHomework: jest.fn(),
    updateHomework: jest.fn(),
    deleteHomework: jest.fn(),
    addComment: jest.fn(),
    setCompletion: jest.fn(),
  };
  const mediaClientService = {
    uploadImage: jest.fn(),
  };
  const inlineMediaService = {
    registerTempUpload: jest.fn(),
  };

  const controller = new HomeworkController(
    homeworkService as never,
    mediaClientService as never,
    inlineMediaService as never,
  );

  beforeEach(() => {
    mediaClientService.uploadImage.mockReset();
    inlineMediaService.registerTempUpload.mockReset();
  });

  it("uploads homework attachments through the media service", async () => {
    const file = {
      buffer: Buffer.from("pdf"),
      mimetype: "application/pdf",
      size: 456,
    };
    mediaClientService.uploadImage.mockResolvedValue({
      url: "https://cdn.example.com/homework/attachments/worksheet.pdf",
      size: 456,
      mimeType: "application/pdf",
    });

    await controller.uploadAttachment(file);

    expect(mediaClientService.uploadImage).toHaveBeenCalledWith(
      "homework-attachment",
      file,
    );
  });

  it("uploads homework inline images and registers temp inline media", async () => {
    const user = {
      id: "teacher-1",
    };
    const file = {
      buffer: Buffer.from("png"),
      mimetype: "image/png",
      size: 123,
    };
    mediaClientService.uploadImage.mockResolvedValue({
      url: "https://cdn.example.com/homework/inline-images/image.webp",
      size: 123,
      mimeType: "image/webp",
    });

    await controller.uploadInlineImage(user as never, "school-1", file);

    expect(mediaClientService.uploadImage).toHaveBeenCalledWith(
      "homework-inline-image",
      file,
    );
    expect(inlineMediaService.registerTempUpload).toHaveBeenCalledWith({
      schoolId: "school-1",
      uploadedByUserId: "teacher-1",
      scope: "HOMEWORK",
      url: "https://cdn.example.com/homework/inline-images/image.webp",
    });
  });

  it("rejects missing inline image uploads before hitting the media service", async () => {
    await expect(
      controller.uploadInlineImage({ id: "teacher-1" } as never, "school-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mediaClientService.uploadImage).not.toHaveBeenCalled();
  });
});
