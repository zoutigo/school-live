import {
  BadRequestException,
  BadGatewayException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import { createHmac, createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { URL } from "node:url";

export type UploadKind =
  | "school-logo"
  | "user-avatar"
  | "messaging-inline-image"
  | "evaluation-attachment";
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

    if (kind === "evaluation-attachment") {
      return this.storeAttachment(file);
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

  async storeAttachment(file?: UploadedMediaFile) {
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
    const objectKey = `evaluations/attachments/${fileName}`;
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
    const response = await this.signedRequest({
      method: "DELETE",
      key: objectKey,
    });

    if (!response.ok && response.status !== 404) {
      throw new BadGatewayException("Unable to delete media object");
    }

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
    const response = await this.signedRequest({
      method: "GET",
      key: objectKey,
    });

    if (response.status === 404) {
      throw new NotFoundException("Build Android introuvable");
    }

    if (!response.ok) {
      throw new BadGatewayException("Unable to download media object");
    }

    const body = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get("content-type") ??
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

  private getS3Config() {
    const endpoint = process.env.MEDIA_S3_ENDPOINT?.trim();
    const accessKey = process.env.MEDIA_S3_ACCESS_KEY?.trim();
    const secretKey = process.env.MEDIA_S3_SECRET_KEY?.trim();
    const bucket = process.env.MEDIA_S3_BUCKET?.trim();
    const region = process.env.MEDIA_S3_REGION?.trim() || "af-south-1";

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

    const headBucket = await this.signedRequest({
      method: "HEAD",
      bucketOnly: true,
    });

    if (headBucket.status === 404) {
      const createBucket = await this.signedRequest({
        method: "PUT",
        bucketOnly: true,
      });
      if (!createBucket.ok) {
        throw new BadGatewayException("Unable to create media bucket");
      }
    } else if (!headBucket.ok) {
      throw new BadGatewayException("Unable to access media bucket");
    }

    const policyPayload = JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${this.getS3Config().bucket}/*`],
        },
      ],
    });

    const putPolicy = await this.signedRequest({
      method: "PUT",
      bucketOnly: true,
      query: "policy=",
      body: Buffer.from(policyPayload, "utf8"),
      contentType: "application/json",
    });

    if (!putPolicy.ok) {
      throw new BadGatewayException("Unable to configure media bucket policy");
    }

    this.bucketReady = true;
  }

  private async putObject(
    objectKey: string,
    body: Buffer,
    contentType: string,
  ) {
    const response = await this.signedRequest({
      method: "PUT",
      key: objectKey,
      body,
      contentType,
    });

    if (!response.ok) {
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
    const response = await this.signedRequest({
      method: "HEAD",
      key: objectKey,
    });

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      throw new BadGatewayException("Unable to access media object");
    }

    return true;
  }

  private async deleteObject(objectKey: string) {
    const response = await this.signedRequest({
      method: "DELETE",
      key: objectKey,
    });

    if (!response.ok && response.status !== 404) {
      throw new BadGatewayException("Unable to delete media object");
    }
  }

  private async copyObject(sourceKey: string, targetKey: string) {
    const response = await this.signedRequest({
      method: "PUT",
      key: targetKey,
      extraHeaders: {
        "x-amz-copy-source": `/${this.getS3Config().bucket}/${this.encodeKey(sourceKey)}`,
      },
    });

    if (!response.ok) {
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
      default:
        return "bin";
    }
  }

  private async signedRequest(params: {
    method: "GET" | "HEAD" | "PUT" | "DELETE";
    bucketOnly?: boolean;
    key?: string;
    query?: string;
    body?: Buffer;
    contentType?: string;
    extraHeaders?: Record<string, string>;
  }) {
    const config = this.getS3Config();
    const endpointUrl = new URL(config.endpoint);
    const host = endpointUrl.host;
    const bucketPath = `/${config.bucket}`;
    const keyPath = params.key ? `/${this.encodeKey(params.key)}` : "";
    const canonicalUri = `${bucketPath}${params.bucketOnly ? "" : keyPath}`;
    const query = params.query ?? "";
    const amzDate = this.nowAmzDate();
    const dateStamp = amzDate.slice(0, 8);
    const bodyBuffer = params.body ?? Buffer.alloc(0);
    const payloadHash = this.sha256Hex(bodyBuffer);

    const headers: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...(params.extraHeaders ?? {}),
    };

    if (params.contentType) {
      headers["content-type"] = params.contentType;
    }

    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((key) => `${key}:${headers[key]}\n`)
      .join("");
    const canonicalRequest = [
      params.method,
      canonicalUri,
      query,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      this.sha256Hex(Buffer.from(canonicalRequest, "utf8")),
    ].join("\n");

    const signingKey = this.getSignatureKey(
      config.secretKey,
      dateStamp,
      config.region,
      "s3",
    );
    const signature = createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");

    const authorization = [
      `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(", ");

    const url = `${config.endpoint}${canonicalUri}${query ? `?${query}` : ""}`;
    return fetch(url, {
      method: params.method,
      headers: {
        ...headers,
        Authorization: authorization,
      },
      body:
        params.method === "HEAD" ||
        params.method === "DELETE" ||
        params.method === "GET"
          ? undefined
          : new Uint8Array(bodyBuffer),
    });
  }

  private sha256Hex(value: Buffer) {
    return createHash("sha256").update(value).digest("hex");
  }

  private nowAmzDate() {
    return new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  }

  private getSignatureKey(
    secretKey: string,
    dateStamp: string,
    regionName: string,
    serviceName: string,
  ) {
    const kDate = createHmac("sha256", `AWS4${secretKey}`)
      .update(dateStamp)
      .digest();
    const kRegion = createHmac("sha256", kDate).update(regionName).digest();
    const kService = createHmac("sha256", kRegion).update(serviceName).digest();
    return createHmac("sha256", kService).update("aws4_request").digest();
  }
}
