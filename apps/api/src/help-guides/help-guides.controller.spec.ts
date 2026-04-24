import { Test, type TestingModule } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { HelpGuidesController } from "./help-guides.controller.js";
import { HelpGuidesService } from "./help-guides.service.js";

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    profileCompleted: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "PARENT" }],
    ...overrides,
  };
}

const makeServiceMock = () => ({
  getCurrentGuide: jest
    .fn()
    .mockResolvedValue({ guide: null, canManage: false }),
  getCurrentPlan: jest.fn().mockResolvedValue({ guide: null, items: [] }),
  getCurrentChapter: jest.fn().mockResolvedValue({ chapter: null }),
  searchCurrent: jest.fn().mockResolvedValue({ guide: null, items: [] }),
  listGuidesAdmin: jest.fn().mockResolvedValue({ items: [] }),
  createGuide: jest.fn().mockResolvedValue({ id: "g1" }),
  updateGuide: jest.fn().mockResolvedValue({ id: "g1" }),
  deleteGuide: jest.fn().mockResolvedValue({ deleted: true }),
  createChapter: jest.fn().mockResolvedValue({ id: "c1" }),
  updateChapter: jest.fn().mockResolvedValue({ id: "c1" }),
  deleteChapter: jest.fn().mockResolvedValue({ deleted: true }),
  assertCanManage: jest.fn(),
});

const makeMediaClientMock = () => ({
  uploadImage: jest
    .fn()
    .mockResolvedValue({ url: "https://cdn.example.test/file" }),
});

describe("HelpGuidesController", () => {
  let controller: HelpGuidesController;
  let service: ReturnType<typeof makeServiceMock>;
  let mediaClient: ReturnType<typeof makeMediaClientMock>;

  beforeEach(async () => {
    service = makeServiceMock();
    mediaClient = makeMediaClientMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HelpGuidesController],
      providers: [
        { provide: HelpGuidesService, useValue: service },
        { provide: MediaClientService, useValue: mediaClient },
      ],
    }).compile();

    controller = module.get<HelpGuidesController>(HelpGuidesController);
  });

  it("délègue getCurrentGuide", async () => {
    const user = makeUser();
    const query = { guideId: "g1" };

    await controller.getCurrentGuide(user, query);

    expect(service.getCurrentGuide).toHaveBeenCalledWith(user, query);
  });

  it("délègue searchCurrent", async () => {
    const user = makeUser();
    const query = { q: "messagerie" };

    await controller.searchCurrent(user, query);

    expect(service.searchCurrent).toHaveBeenCalledWith(user, query);
  });

  it("délègue createChapter", async () => {
    const admin = makeUser({ platformRoles: ["SUPER_ADMIN"], memberships: [] });
    const dto = {
      title: "Créer un message",
      contentType: "RICH_TEXT" as const,
      contentHtml: "<p>test</p>",
    };

    await controller.createChapter(admin, "guide-1", dto);

    expect(service.createChapter).toHaveBeenCalledWith(admin, "guide-1", dto);
  });

  it("uploade une image inline via media", async () => {
    const admin = makeUser({ platformRoles: ["SUPER_ADMIN"], memberships: [] });
    const file = {
      buffer: Buffer.from("image"),
      mimetype: "image/png",
      size: 128,
    };

    await controller.uploadInlineImage(admin, file);

    expect(service.assertCanManage).toHaveBeenCalledWith(admin);
    expect(mediaClient.uploadImage).toHaveBeenCalledWith(
      "messaging-inline-image",
      file,
    );
  });

  it("uploade une video inline via media", async () => {
    const admin = makeUser({ platformRoles: ["SUPER_ADMIN"], memberships: [] });
    const file = {
      buffer: Buffer.from("video"),
      mimetype: "video/mp4",
      size: 2048,
    };

    await controller.uploadInlineVideo(admin, file);

    expect(service.assertCanManage).toHaveBeenCalledWith(admin);
    expect(mediaClient.uploadImage).toHaveBeenCalledWith(
      "guide-inline-video",
      file,
    );
  });
});
