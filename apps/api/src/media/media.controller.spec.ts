import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { MediaController } from "./media.controller.js";
import { ImageStorageService } from "../files/image-storage.service.js";
import type { UploadKind } from "../files/image-storage.service.js";

describe("MediaController", () => {
  let controller: MediaController;
  let service: { storeImage: jest.Mock };

  const FILE = { buffer: Buffer.from("x"), mimetype: "image/png", size: 1 };

  beforeEach(async () => {
    service = { storeImage: jest.fn().mockResolvedValue({ url: "x" }) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [{ provide: ImageStorageService, useValue: service }],
    }).compile();

    controller = module.get(MediaController);
  });

  // Régression : ce whitelist doit rester synchronisé avec `UploadKind`
  // (image-storage.service.ts) — un `kind` déclaré dans le type mais absent
  // d'ici est rejeté à tort avec "Type upload non supporte", ce qui a cassé
  // l'insertion d'image et les pièces jointes du module Resources.
  const ALL_UPLOAD_KINDS: UploadKind[] = [
    "school-logo",
    "user-avatar",
    "messaging-inline-image",
    "homework-inline-image",
    "resource-inline-image",
    "guide-inline-video",
    "evaluation-attachment",
    "homework-attachment",
    "resource-attachment",
    "messaging-attachment",
    "test-execution-attachment",
    "ticket-attachment",
    "feed-attachment",
  ];

  it.each(ALL_UPLOAD_KINDS)(
    "accepts the declared upload kind %s and delegates to the storage service",
    (kind) => {
      controller.upload(kind, FILE, undefined);
      expect(service.storeImage).toHaveBeenCalledWith(kind, FILE);
    },
  );

  it("rejects an unknown upload kind", () => {
    expect(() => controller.upload("not-a-real-kind", FILE, undefined)).toThrow(
      BadRequestException,
    );
    expect(service.storeImage).not.toHaveBeenCalled();
  });

  it("rejects the request when the media token is configured and does not match", () => {
    process.env.MEDIA_INTERNAL_TOKEN = "secret";
    try {
      expect(() =>
        controller.upload("resource-inline-image", FILE, "wrong"),
      ).toThrow("Invalid media token");
    } finally {
      delete process.env.MEDIA_INTERNAL_TOKEN;
    }
  });
});
