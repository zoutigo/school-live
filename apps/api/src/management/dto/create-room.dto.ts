import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateRoomDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxConcurrentSlots?: number;

  @IsOptional()
  @IsIn(["AVAILABLE", "UNAVAILABLE", "MAINTENANCE"])
  status?: "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE";
}
