import { MobilePushPlatform } from "@prisma/client";
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterMobilePushTokenDto {
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  token!: string;

  @IsEnum(MobilePushPlatform)
  platform!: MobilePushPlatform;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  projectId?: string;
}
