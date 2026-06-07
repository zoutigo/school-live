import { IsOptional, IsString, Matches } from "class-validator";

export class PublishAndroidBuildDto {
  @IsString()
  versionName!: string;

  @IsString()
  @Matches(/^\d+$/)
  versionCode!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  minimumVersionCode?: string;

  @IsOptional()
  @IsString()
  gitSha?: string;

  @IsOptional()
  @IsString()
  buildId?: string;
}
