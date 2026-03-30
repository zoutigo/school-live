import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { UploadKind } from "../files/image-storage.service.js";

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

type UploadedAndroidBuildFile = UploadedImageFile;

@Injectable()
export class MediaClientService {
  async uploadImage(kind: UploadKind, file?: UploadedImageFile) {
    const mediaServiceUrl = process.env.MEDIA_SERVICE_URL?.trim();
    if (!mediaServiceUrl) {
      throw new ServiceUnavailableException("MEDIA_SERVICE_URL not configured");
    }

    if (!file) {
      throw new BadGatewayException("Missing upload file");
    }

    const formData = new FormData();
    const bytes = new Uint8Array(file.buffer);
    formData.append(
      "file",
      new Blob([bytes], { type: file.mimetype }),
      "upload",
    );

    const headers: Record<string, string> = {};
    const internalToken = process.env.MEDIA_INTERNAL_TOKEN?.trim();
    if (internalToken) {
      headers["x-media-token"] = internalToken;
    }

    const response = await fetch(
      `${mediaServiceUrl.replace(/\/$/, "")}/internal/uploads/${kind}`,
      {
        method: "POST",
        headers,
        body: formData,
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string | string[];
      } | null;
      const message =
        payload?.message && Array.isArray(payload.message)
          ? payload.message.join(", ")
          : (payload?.message ?? "Media service upload failed");
      throw new BadGatewayException(message);
    }

    return (await response.json()) as {
      url: string;
      size: number;
      width: number | null;
      height: number | null;
      mimeType: string;
    };
  }

  async deleteImageByUrl(url: string) {
    const mediaServiceUrl = process.env.MEDIA_SERVICE_URL?.trim();
    if (!mediaServiceUrl) {
      throw new ServiceUnavailableException("MEDIA_SERVICE_URL not configured");
    }

    const headers: Record<string, string> = {};
    const internalToken = process.env.MEDIA_INTERNAL_TOKEN?.trim();
    if (internalToken) {
      headers["x-media-token"] = internalToken;
    }

    const endpoint = new URL(
      `${mediaServiceUrl.replace(/\/$/, "")}/internal/uploads`,
    );
    endpoint.searchParams.set("url", url);

    const response = await fetch(endpoint.toString(), {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string | string[];
      } | null;
      const message =
        payload?.message && Array.isArray(payload.message)
          ? payload.message.join(", ")
          : (payload?.message ?? "Media service delete failed");
      throw new BadGatewayException(message);
    }
  }

  async publishAndroidBuild(
    file: UploadedAndroidBuildFile | undefined,
    metadata: {
      versionName: string;
      versionCode: number;
      gitSha?: string;
      buildId?: string;
    },
  ) {
    const mediaServiceUrl = process.env.MEDIA_SERVICE_URL?.trim();
    if (!mediaServiceUrl) {
      throw new ServiceUnavailableException("MEDIA_SERVICE_URL not configured");
    }

    if (!file) {
      throw new BadGatewayException("Missing Android build file");
    }

    const formData = new FormData();
    const bytes = new Uint8Array(file.buffer);
    formData.append(
      "file",
      new Blob([bytes], { type: file.mimetype }),
      "scolive-latest.apk",
    );
    formData.append("versionName", metadata.versionName);
    formData.append("versionCode", String(metadata.versionCode));
    if (metadata.gitSha) {
      formData.append("gitSha", metadata.gitSha);
    }
    if (metadata.buildId) {
      formData.append("buildId", metadata.buildId);
    }

    const headers: Record<string, string> = {};
    const internalToken = process.env.MEDIA_INTERNAL_TOKEN?.trim();
    if (internalToken) {
      headers["x-media-token"] = internalToken;
    }

    const response = await fetch(
      `${mediaServiceUrl.replace(/\/$/, "")}/internal/mobile-builds/android`,
      {
        method: "POST",
        headers,
        body: formData,
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string | string[];
      } | null;
      const message =
        payload?.message && Array.isArray(payload.message)
          ? payload.message.join(", ")
          : (payload?.message ?? "Android build publish failed");
      throw new BadGatewayException(message);
    }

    return (await response.json()) as {
      versionName: string;
      versionCode: number;
      uploadedAt: string;
      fileSize: number;
      mimeType: string;
      gitSha?: string;
      buildId?: string;
      downloadUrl: string;
    };
  }
}
