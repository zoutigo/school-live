import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { MediaClientService } from "../media-client/media-client.service.js";
import { PublishAndroidBuildDto } from "./dto/publish-android-build.dto.js";

@Injectable()
export class MobileBuildsService {
  constructor(private readonly mediaClientService: MediaClientService) {}

  ensureUploadAuthorized(authorization?: string) {
    const expectedToken = process.env.MOBILE_BUILD_UPLOAD_TOKEN?.trim();
    if (!expectedToken) {
      throw new ServiceUnavailableException(
        "MOBILE_BUILD_UPLOAD_TOKEN not configured",
      );
    }

    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";

    if (token !== expectedToken) {
      throw new UnauthorizedException("Invalid mobile build token");
    }
  }

  publishAndroidBuild(
    payload: PublishAndroidBuildDto,
    file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    return this.mediaClientService.publishAndroidBuild(file, {
      versionName: payload.versionName,
      versionCode: Number(payload.versionCode),
      gitSha: payload.gitSha,
      buildId: payload.buildId,
    });
  }

  latestAndroidDownloadPath() {
    return "/media/mobile-builds/android/latest.apk";
  }

  latestAndroidMetaPath() {
    return "/media/mobile-builds/android/latest.json";
  }
}
