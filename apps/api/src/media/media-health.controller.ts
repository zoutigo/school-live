import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ImageStorageService } from "../files/image-storage.service.js";

@Controller()
export class MediaHealthController {
  constructor(private readonly imageStorageService: ImageStorageService) {}

  @Get("health")
  async health() {
    try {
      const storage = await this.imageStorageService.checkStorageHealth();
      return {
        status: "ok",
        service: "media",
        storage,
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "degraded",
        service: "media",
        message: "Storage backend unavailable",
      });
    }
  }
}
