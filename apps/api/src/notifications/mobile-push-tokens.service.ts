import { Injectable } from "@nestjs/common";
import { MobilePushPlatform, MobilePushProvider } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import type { RegisterMobilePushTokenDto } from "./dto/register-mobile-push-token.dto.js";

@Injectable()
export class MobilePushTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async registerToken(
    userId: string,
    schoolId: string,
    payload: RegisterMobilePushTokenDto,
  ) {
    return this.prisma.mobilePushToken.upsert({
      where: { token: payload.token.trim() },
      update: {
        userId,
        schoolId,
        provider: MobilePushProvider.EXPO,
        platform: payload.platform ?? MobilePushPlatform.UNKNOWN,
        deviceId: payload.deviceId?.trim() || null,
        deviceName: payload.deviceName?.trim() || null,
        appVersion: payload.appVersion?.trim() || null,
        projectId: payload.projectId?.trim() || null,
        isActive: true,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        schoolId,
        provider: MobilePushProvider.EXPO,
        platform: payload.platform ?? MobilePushPlatform.UNKNOWN,
        token: payload.token.trim(),
        deviceId: payload.deviceId?.trim() || null,
        deviceName: payload.deviceName?.trim() || null,
        appVersion: payload.appVersion?.trim() || null,
        projectId: payload.projectId?.trim() || null,
        isActive: true,
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        token: true,
        platform: true,
        isActive: true,
      },
    });
  }

  async unregisterToken(userId: string, schoolId: string, token: string) {
    const result = await this.prisma.mobilePushToken.updateMany({
      where: {
        userId,
        schoolId,
        token: token.trim(),
      },
      data: {
        isActive: false,
        lastSeenAt: new Date(),
      },
    });

    return { deactivated: result.count > 0 };
  }
}
