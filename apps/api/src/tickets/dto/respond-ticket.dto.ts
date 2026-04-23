import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class RespondTicketDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
