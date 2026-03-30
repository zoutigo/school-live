import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Redirect,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PublishAndroidBuildDto } from "./dto/publish-android-build.dto.js";
import { MobileBuildsService } from "./mobile-builds.service.js";

@Controller("mobile-builds")
export class MobileBuildsController {
  constructor(private readonly mobileBuildsService: MobileBuildsService) {}

  @Post("android")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 250 * 1024 * 1024,
      },
    }),
  )
  publishAndroidBuild(
    @Body() payload: PublishAndroidBuildDto,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number },
    @Headers("authorization") authorization?: string,
  ) {
    this.mobileBuildsService.ensureUploadAuthorized(authorization);
    return this.mobileBuildsService.publishAndroidBuild(payload, file);
  }

  @Get("android/latest")
  @Redirect(undefined, 302)
  latestAndroidBuild() {
    return {
      url: this.mobileBuildsService.latestAndroidDownloadPath(),
    };
  }

  @Get("android/latest/meta")
  @Redirect(undefined, 302)
  latestAndroidBuildMeta() {
    return {
      url: this.mobileBuildsService.latestAndroidMetaPath(),
    };
  }
}
