import { IsString, MaxLength, MinLength } from "class-validator";

export class UnregisterMobilePushTokenDto {
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  token!: string;
}
