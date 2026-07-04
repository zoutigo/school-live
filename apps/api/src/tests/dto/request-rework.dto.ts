import { IsBoolean, IsOptional, IsString } from "class-validator";

export class RequestReworkDto {
  @IsBoolean()
  requested!: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
