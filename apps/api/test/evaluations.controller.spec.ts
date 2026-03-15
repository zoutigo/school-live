import { BadRequestException } from "@nestjs/common";
import { EvaluationsController } from "../src/evaluations/evaluations.controller";

describe("EvaluationsController", () => {
  const evaluationsService = {
    getTeacherContext: jest.fn(),
    listClassEvaluations: jest.fn(),
    createEvaluation: jest.fn(),
    getEvaluation: jest.fn(),
    updateEvaluation: jest.fn(),
    upsertScores: jest.fn(),
    listClassTermReports: jest.fn(),
    upsertClassTermReports: jest.fn(),
    listStudentNotes: jest.fn(),
  };
  const mediaClientService = {
    uploadImage: jest.fn(),
  };

  const controller = new EvaluationsController(
    evaluationsService as never,
    mediaClientService as never,
  );

  beforeEach(() => {
    mediaClientService.uploadImage.mockReset();
  });

  it("uploads evaluation attachments through the media service", async () => {
    const file = {
      buffer: Buffer.from("png"),
      mimetype: "image/png",
      size: 123,
    };
    mediaClientService.uploadImage.mockResolvedValue({
      url: "https://cdn.example.com/evaluations/attachment.png",
      size: 123,
      mimeType: "image/png",
    });

    await controller.uploadAttachment(file);

    expect(mediaClientService.uploadImage).toHaveBeenCalledWith(
      "evaluation-attachment",
      file,
    );
  });

  it("keeps backend validation when no file is provided", async () => {
    mediaClientService.uploadImage.mockRejectedValue(
      new BadRequestException("Missing upload file"),
    );

    await expect(controller.uploadAttachment(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
