import {
  BadRequestException,
  Controller,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ImageStorageService } from "../files/image-storage.service.js";

@Controller("internal/uploads")
export class MediaController {
  constructor(private readonly imageStorageService: ImageStorageService) {}

  @Post(":kind")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  upload(
    @Param("kind") kind: string,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
    @Headers("x-media-token") token?: string,
  ) {
    const expectedToken = process.env.MEDIA_INTERNAL_TOKEN?.trim();
    if (expectedToken && token !== expectedToken) {
      throw new UnauthorizedException("Invalid media token");
    }

    if (
      kind !== "school-logo" &&
      kind !== "user-avatar" &&
      kind !== "messaging-inline-image"
    ) {
      throw new BadRequestException("Type upload non supporte");
    }

    return this.imageStorageService.storeImage(kind, file);
  }
}
