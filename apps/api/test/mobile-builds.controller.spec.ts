import {
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { MobileBuildsController } from "../src/mobile-builds/mobile-builds.controller";

describe("MobileBuildsController", () => {
  const mobileBuildsService = {
    ensureUploadAuthorized: jest.fn(),
    publishAndroidBuild: jest.fn(),
    latestAndroidDownloadPath: jest.fn(),
    latestAndroidMetaPath: jest.fn(),
  };

  const controller = new MobileBuildsController(mobileBuildsService as never);

  beforeEach(() => {
    Object.values(mobileBuildsService).forEach((fn) => fn.mockReset());
    mobileBuildsService.latestAndroidDownloadPath.mockReturnValue(
      "/media/mobile-builds/android/latest.apk",
    );
    mobileBuildsService.latestAndroidMetaPath.mockReturnValue(
      "/media/mobile-builds/android/latest.json",
    );
  });

  it("delegates Android build publication after auth", async () => {
    const file = {
      buffer: Buffer.from("apk"),
      mimetype: "application/vnd.android.package-archive",
      size: 123,
    };
    const payload = {
      versionName: "1.2.3",
      versionCode: "42",
      gitSha: "abcdef1",
      buildId: "main-42",
    };

    await controller.publishAndroidBuild(payload, file, "Bearer upload-token");

    expect(mobileBuildsService.ensureUploadAuthorized).toHaveBeenCalledWith(
      "Bearer upload-token",
    );
    expect(mobileBuildsService.publishAndroidBuild).toHaveBeenCalledWith(
      payload,
      file,
    );
  });

  it("returns redirect payloads for latest build routes", () => {
    expect(controller.latestAndroidBuild()).toEqual({
      url: "/media/mobile-builds/android/latest.apk",
    });

    expect(controller.latestAndroidBuildMeta()).toEqual({
      url: "/media/mobile-builds/android/latest.json",
    });
  });

  it("keeps service auth errors intact", () => {
    mobileBuildsService.ensureUploadAuthorized.mockImplementation(() => {
      throw new UnauthorizedException("Invalid mobile build token");
    });

    expect(() =>
      controller.publishAndroidBuild(
        { versionName: "1.0.0", versionCode: "1" },
        {
          buffer: Buffer.from("apk"),
          mimetype: "application/vnd.android.package-archive",
          size: 1,
        },
        "Bearer bad-token",
      ),
    ).toThrow(UnauthorizedException);

    mobileBuildsService.ensureUploadAuthorized.mockImplementation(() => {
      throw new ServiceUnavailableException(
        "MOBILE_BUILD_UPLOAD_TOKEN not configured",
      );
    });

    expect(() =>
      controller.publishAndroidBuild(
        { versionName: "1.0.0", versionCode: "1" },
        {
          buffer: Buffer.from("apk"),
          mimetype: "application/vnd.android.package-archive",
          size: 1,
        },
        "Bearer missing-token",
      ),
    ).toThrow(ServiceUnavailableException);
  });
});
