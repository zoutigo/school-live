import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from "@nestjs/common";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getFilesDirectory } from "./files-path.util.js";

type UploadKind = "school-logo" | "user-avatar";
type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

@Injectable()
export class ImageStorageService {
  async storeImage(kind: UploadKind, file?: UploadedImageFile) {
    if (!file) {
      throw new BadRequestException("Fichier image manquant");
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        "Type de fichier invalide. Formats acceptes: JPG, PNG, WEBP",
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw new PayloadTooLargeException(
        "Image trop lourde. Taille maximale: 5MB",
      );
    }

    const image = sharp(file.buffer, { failOn: "error" }).rotate();
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new BadRequestException("Image invalide");
    }

    const variant =
      kind === "school-logo"
        ? this.getSchoolVariant()
        : this.getAvatarVariant();
    const outputBuffer = await variant.transform(image);
    const outputMetadata = await sharp(outputBuffer).metadata();

    const filesDir = getFilesDirectory();
    const absoluteDir = path.join(filesDir, variant.subfolder);
    await fs.mkdir(absoluteDir, { recursive: true });

    const fileName = `${Date.now()}-${randomUUID()}.webp`;
    const absolutePath = path.join(absoluteDir, fileName);
    await fs.writeFile(absolutePath, outputBuffer);

    return {
      url: `/files/${variant.subfolder}/${fileName}`,
      size: outputBuffer.length,
      width: outputMetadata.width ?? null,
      height: outputMetadata.height ?? null,
      mimeType: "image/webp",
    };
  }

  private getSchoolVariant() {
    return {
      subfolder: "schools/logos",
      transform: (image: sharp.Sharp) =>
        image
          .resize({
            width: 1200,
            height: 1200,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({
            quality: 82,
            effort: 4,
          })
          .toBuffer(),
    };
  }

  private getAvatarVariant() {
    return {
      subfolder: "users/avatars",
      transform: (image: sharp.Sharp) =>
        image
          .resize({
            width: 512,
            height: 512,
            fit: "cover",
            position: "attention",
          })
          .webp({
            quality: 80,
            effort: 4,
          })
          .toBuffer(),
    };
  }
}
