import {
  BadRequestException,
  BadGatewayException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export type UploadKind =
  | "school-logo"
  | "user-avatar"
  | "messaging-inline-image"
  | "homework-inline-image"
  | "guide-inline-video"
  | "evaluation-attachment"
  | "homework-attachment"
  | "messaging-attachment"
  | "ticket-attachment";
type UploadedMediaFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};
type AndroidBuildSlot = "latest" | "previous-1" | "previous-2";
type AndroidBuildMetadata = {
  versionName: string;
  versionCode: number;
  uploadedAt: string;
  fileSize: number;
  mimeType: string;
  gitSha?: string;
  buildId?: string;
  downloadUrl: string;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const MAX_ANDROID_BUILD_BYTES = 250 * 1024 * 1024;
const MAX_INLINE_VIDEO_BYTES = 80 * 1024 * 1024;
const ALLOWED_INLINE_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const ANDROID_BUILD_MIME_TYPES = new Set([
  "application/vnd.android.package-archive",
  "application/octet-stream",
]);

@Injectable()
export class ImageStorageService {
  private bucketReady = false;

  async checkStorageHealth() {
    await this.ensureBucket();
    const config = this.getS3Config();
    return {
      provider: "minio-s3",
      endpoint: config.endpoint,
      bucket: config.bucket,
      region: config.region,
      publicBaseUrl: config.publicBaseUrl,
    };
  }

  async storeImage(kind: UploadKind, file?: UploadedMediaFile) {
    if (!file) {
      throw new BadRequestException("Fichier image manquant");
    }

    if (kind === "evaluation-attachment" || kind === "messaging-attachment") {
      return this.storeAttachment(kind, file);
    }

    if (kind === "homework-attachment") {
      return this.storeAttachment(kind, file);
    }

    if (kind === "guide-inline-video") {
      return this.storeInlineVideo(file);
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
        : kind === "user-avatar"
          ? this.getAvatarVariant()
          : kind === "homework-inline-image"
            ? this.getHomeworkInlineVariant()
            : this.getMessagingInlineVariant();
    const outputBuffer = await variant.transform(image);
    const outputMetadata = await sharp(outputBuffer).metadata();
    const fileName = `${Date.now()}-${randomUUID()}.webp`;
    const objectKey = `${variant.subfolder}/${fileName}`;
    await this.ensureBucket();
    await this.putObject(objectKey, outputBuffer, "image/webp");

    return {
      url: this.toPublicUrl(objectKey),
      size: outputBuffer.length,
      width: outputMetadata.width ?? null,
      height: outputMetadata.height ?? null,
      mimeType: "image/webp",
    };
  }

  async storeAttachment(
    kind:
      | "evaluation-attachment"
      | "messaging-attachment"
      | "homework-attachment",
    file?: UploadedMediaFile,
  ) {
    if (!file) {
      throw new BadRequestException("Fichier piece jointe manquant");
    }

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Type de piece jointe non supporte");
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new PayloadTooLargeException(
        "Piece jointe trop lourde. Taille maximale: 10MB",
      );
    }

    const extension = this.extensionFromMimeType(file.mimetype);
    const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
    const objectKey =
      kind === "messaging-attachment"
        ? `messaging/attachments/${fileName}`
        : kind === "homework-attachment"
          ? `homework/attachments/${fileName}`
          : `evaluations/attachments/${fileName}`;
    await this.ensureBucket();
    await this.putObject(objectKey, file.buffer, file.mimetype);

    return {
      url: this.toPublicUrl(objectKey),
      size: file.size,
      width: null,
      height: null,
      mimeType: file.mimetype,
    };
  }

  async storeInlineVideo(file?: UploadedMediaFile) {
    if (!file) {
      throw new BadRequestException("Fichier video manquant");
    }

    if (!ALLOWED_INLINE_VIDEO_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Type de video non supporte");
    }

    if (file.size > MAX_INLINE_VIDEO_BYTES) {
      throw new PayloadTooLargeException(
        "Video trop lourde. Taille maximale: 80MB",
      );
    }

    const extension = this.extensionFromMimeType(file.mimetype);
    const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
    const objectKey = `help-guides/inline-videos/${fileName}`;
    await this.ensureBucket();
    await this.putObject(objectKey, file.buffer, file.mimetype);

    return {
      url: this.toPublicUrl(objectKey),
      size: file.size,
      width: null,
      height: null,
      mimeType: file.mimetype,
    };
  }

  async deleteImageByPublicUrl(url?: string) {
    if (!url) {
      throw new BadRequestException("URL image manquante");
    }

    await this.ensureBucket();
    const objectKey = this.objectKeyFromPublicUrl(url);
    await this.deleteObject(objectKey);

    return { success: true };
  }

  async publishAndroidBuild(
    file: UploadedMediaFile | undefined,
    metadata: {
      versionName: string;
      versionCode: number;
      gitSha?: string;
      buildId?: string;
    },
  ) {
    if (!file) {
      throw new BadRequestException("Fichier APK manquant");
    }

    if (!ANDROID_BUILD_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Type de build Android non supporte");
    }

    if (file.size > MAX_ANDROID_BUILD_BYTES) {
      throw new PayloadTooLargeException(
        "Build Android trop lourd. Taille maximale: 250MB",
      );
    }

    await this.ensureBucket();
    await this.rotateAndroidBuilds();

    const latestApkKey = this.mobileBuildObjectKey("latest", "apk");
    const latestMetadata = this.createAndroidBuildMetadata(file, metadata);

    await this.putObject(latestApkKey, file.buffer, file.mimetype);
    await this.putJsonObject(
      this.mobileBuildObjectKey("latest", "json"),
      latestMetadata,
    );

    return latestMetadata;
  }

  async getAndroidBuildAsset(
    slot: AndroidBuildSlot,
    extension: "apk" | "json",
  ) {
    await this.ensureBucket();

    const objectKey = this.mobileBuildObjectKey(slot, extension);
    const client = this.getS3Client();
    const { bucket } = this.getS3Config();

    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: objectKey,
        }),
      );
      const body = Buffer.from(await response.Body!.transformToByteArray());
      const contentType =
        response.ContentType ??
        (extension === "apk"
          ? "application/vnd.android.package-archive"
          : "application/json");

      return {
        body,
        contentType,
        fileName:
          extension === "apk" ? `scolive-${slot}.apk` : `scolive-${slot}.json`,
        downloadUrl: this.getAndroidBuildPublicPath(slot, extension),
      };
    } catch (error) {
      if (
        error instanceof NoSuchKey ||
        (error instanceof S3ServiceException &&
          error.$metadata.httpStatusCode === 404)
      ) {
        throw new NotFoundException("Build Android introuvable");
      }
      throw new BadGatewayException("Unable to download media object");
    }
  }

  getAndroidBuildPublicPath(slot: AndroidBuildSlot, extension: "apk" | "json") {
    const webUrl = process.env.WEB_URL?.trim().replace(/\/$/, "");
    const path = `/media/mobile-builds/android/${slot}.${extension}`;
    return webUrl ? `${webUrl}${path}` : path;
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

  private getMessagingInlineVariant() {
    return {
      subfolder: "messaging/inline-images",
      transform: (image: sharp.Sharp) =>
        image
          .resize({
            width: 1920,
            height: 1920,
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

  private getHomeworkInlineVariant() {
    return {
      subfolder: "homework/inline-images",
      transform: (image: sharp.Sharp) =>
        image
          .resize({
            width: 1920,
            height: 1920,
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

  private getS3Config() {
    const endpoint = process.env.MEDIA_S3_ENDPOINT?.trim();
    const accessKey = process.env.MEDIA_S3_ACCESS_KEY?.trim();
    const secretKey = process.env.MEDIA_S3_SECRET_KEY?.trim();
    const bucket = process.env.MEDIA_S3_BUCKET?.trim();
    const region = process.env.MEDIA_S3_REGION?.trim() || "us-east-1";

    if (!endpoint || !accessKey || !secretKey || !bucket) {
      throw new BadGatewayException("MinIO/S3 configuration is incomplete");
    }

    return {
      endpoint: endpoint.replace(/\/$/, ""),
      accessKey,
      secretKey,
      bucket,
      region,
      publicBaseUrl:
        process.env.MEDIA_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") ||
        `${endpoint.replace(/\/$/, "")}/${bucket}`,
    };
  }

  private toPublicUrl(objectKey: string) {
    const { publicBaseUrl } = this.getS3Config();
    return `${publicBaseUrl}/${this.encodeKey(objectKey)}`;
  }

  private encodeKey(objectKey: string) {
    return objectKey
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
  }

  private async ensureBucket() {
    if (this.bucketReady) {
      return;
    }

    const client = this.getS3Client();
    const { bucket } = this.getS3Config();

    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (error) {
      const isMissingBucket =
        (error instanceof S3ServiceException &&
          error.$metadata.httpStatusCode === 404) ||
        (error instanceof Error &&
          (error.name === "NotFound" || error.name === "NoSuchBucket"));

      if (isMissingBucket) {
        try {
          await client.send(new CreateBucketCommand({ Bucket: bucket }));
        } catch {
          throw new BadGatewayException("Unable to create media bucket");
        }
      } else {
        throw new BadGatewayException("Unable to access media bucket");
      }
    }

    this.bucketReady = true;
  }

  private async putObject(
    objectKey: string,
    body: Buffer,
    contentType: string,
  ) {
    const client = this.getS3Client();
    const { bucket } = this.getS3Config();

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch {
      throw new BadGatewayException("Unable to upload media object");
    }
  }

  private async putJsonObject(objectKey: string, payload: object) {
    await this.putObject(
      objectKey,
      Buffer.from(JSON.stringify(payload), "utf8"),
      "application/json",
    );
  }

  private async rotateAndroidBuilds() {
    const latestApkKey = this.mobileBuildObjectKey("latest", "apk");
    const latestJsonKey = this.mobileBuildObjectKey("latest", "json");
    const previous1ApkKey = this.mobileBuildObjectKey("previous-1", "apk");
    const previous1JsonKey = this.mobileBuildObjectKey("previous-1", "json");
    const previous2ApkKey = this.mobileBuildObjectKey("previous-2", "apk");
    const previous2JsonKey = this.mobileBuildObjectKey("previous-2", "json");

    const hasPrevious1 = await this.objectExists(previous1ApkKey);
    if (hasPrevious1) {
      await this.copyObject(previous1ApkKey, previous2ApkKey);
      if (await this.objectExists(previous1JsonKey)) {
        await this.copyObject(previous1JsonKey, previous2JsonKey);
      } else {
        await this.deleteObject(previous2JsonKey);
      }
    } else {
      await this.deleteObject(previous2ApkKey);
      await this.deleteObject(previous2JsonKey);
    }

    const hasLatest = await this.objectExists(latestApkKey);
    if (hasLatest) {
      await this.copyObject(latestApkKey, previous1ApkKey);
      if (await this.objectExists(latestJsonKey)) {
        await this.copyObject(latestJsonKey, previous1JsonKey);
      } else {
        await this.deleteObject(previous1JsonKey);
      }
    } else {
      await this.deleteObject(previous1ApkKey);
      await this.deleteObject(previous1JsonKey);
    }
  }

  private async objectExists(objectKey: string) {
    const client = this.getS3Client();
    const { bucket } = this.getS3Config();

    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: objectKey,
        }),
      );
      return true;
    } catch (error) {
      if (
        error instanceof S3ServiceException &&
        error.$metadata.httpStatusCode === 404
      ) {
        return false;
      }
      throw new BadGatewayException("Unable to access media object");
    }
  }

  private async deleteObject(objectKey: string) {
    const client = this.getS3Client();
    const { bucket } = this.getS3Config();

    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: objectKey,
        }),
      );
    } catch (error) {
      if (
        error instanceof S3ServiceException &&
        error.$metadata.httpStatusCode === 404
      ) {
        return;
      }
      throw new BadGatewayException("Unable to delete media object");
    }
  }

  private async copyObject(sourceKey: string, targetKey: string) {
    const client = this.getS3Client();
    const { bucket } = this.getS3Config();

    try {
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          Key: targetKey,
          CopySource: `/${bucket}/${this.encodeKey(sourceKey)}`,
        }),
      );
    } catch {
      throw new BadGatewayException("Unable to copy media object");
    }
  }

  private mobileBuildObjectKey(
    slot: AndroidBuildSlot,
    extension: "apk" | "json",
  ) {
    return `mobile-builds/android/${slot}.${extension}`;
  }

  private createAndroidBuildMetadata(
    file: UploadedMediaFile,
    metadata: {
      versionName: string;
      versionCode: number;
      gitSha?: string;
      buildId?: string;
    },
  ): AndroidBuildMetadata {
    return {
      versionName: metadata.versionName,
      versionCode: metadata.versionCode,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size,
      mimeType: file.mimetype,
      gitSha: metadata.gitSha,
      buildId: metadata.buildId,
      downloadUrl: this.getAndroidBuildPublicPath("latest", "apk"),
    };
  }

  private objectKeyFromPublicUrl(url: string) {
    const config = this.getS3Config();
    const normalizedPublicBase = config.publicBaseUrl.replace(/\/$/, "");
    if (!url.startsWith(`${normalizedPublicBase}/`)) {
      throw new BadRequestException("URL media non supportee");
    }
    const encodedKey = url.slice(normalizedPublicBase.length + 1);
    return encodedKey
      .split("/")
      .map((part) => decodeURIComponent(part))
      .join("/");
  }

  private extensionFromMimeType(mimeType: string) {
    switch (mimeType) {
      case "image/jpeg":
        return "jpg";
      case "image/png":
        return "png";
      case "image/webp":
        return "webp";
      case "application/pdf":
        return "pdf";
      case "text/plain":
        return "txt";
      case "application/msword":
        return "doc";
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return "docx";
      case "application/vnd.ms-excel":
        return "xls";
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        return "xlsx";
      case "application/vnd.ms-powerpoint":
        return "ppt";
      case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        return "pptx";
      case "video/mp4":
        return "mp4";
      case "video/webm":
        return "webm";
      case "video/quicktime":
        return "mov";
      default:
        return "bin";
    }
  }

  private getS3Client() {
    const config = this.getS3Config();
    return new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
  }
}
