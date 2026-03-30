import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
  StreamableFile,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { ImageStorageService } from "../files/image-storage.service.js";
import { PublishAndroidBuildDto } from "../mobile-builds/dto/publish-android-build.dto.js";

@Controller()
export class MobileBuildsMediaController {
  constructor(private readonly imageStorageService: ImageStorageService) {}

  @Post("internal/mobile-builds/android")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 250 * 1024 * 1024,
      },
    }),
  )
  publishAndroidBuild(
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number },
    @Body() payload: PublishAndroidBuildDto,
    @Headers("x-media-token") token?: string,
  ) {
    const expectedToken = process.env.MEDIA_INTERNAL_TOKEN?.trim();
    if (expectedToken && token !== expectedToken) {
      throw new UnauthorizedException("Invalid media token");
    }

    return this.imageStorageService.publishAndroidBuild(file, {
      versionName: payload.versionName,
      versionCode: Number(payload.versionCode),
      gitSha: payload.gitSha,
      buildId: payload.buildId,
    });
  }

  @Get("mobile-builds/android/:slot.:extension")
  async getAndroidBuild(
    @Param("slot") slot: string,
    @Param("extension") extension: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (slot !== "latest" && slot !== "previous-1" && slot !== "previous-2") {
      throw new BadRequestException("Slot build Android non supporte");
    }

    if (extension !== "apk" && extension !== "json") {
      throw new BadRequestException("Extension build Android non supportee");
    }

    const asset = await this.imageStorageService.getAndroidBuildAsset(
      slot,
      extension,
    );

    response.setHeader("Content-Type", asset.contentType);
    response.setHeader(
      "Content-Disposition",
      extension === "apk"
        ? `attachment; filename="${asset.fileName}"`
        : `inline; filename="${asset.fileName}"`,
    );
    response.setHeader("Cache-Control", "public, max-age=300");

    return new StreamableFile(asset.body);
  }
}
