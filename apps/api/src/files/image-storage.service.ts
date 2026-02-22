import {
  BadRequestException,
  BadGatewayException,
  Injectable,
  PayloadTooLargeException,
} from "@nestjs/common";
import { createHmac, createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { URL } from "node:url";

export type UploadKind =
  | "school-logo"
  | "user-avatar"
  | "messaging-inline-image";
type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

  private async signedRequest(params: {
    method: "HEAD" | "PUT" | "DELETE";
    bucketOnly?: boolean;
    key?: string;
    query?: string;
    body?: Buffer;
    contentType?: string;
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
        params.method === "HEAD" || params.method === "DELETE"
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
