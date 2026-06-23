import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class ListAvailableRoomsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  weekday!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  startMinute!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  endMinute!: number;

  @IsOptional()
  @IsDateString()
  occurrenceDate?: string;

  @IsOptional()
  @IsString()
  excludeSlotId?: string;

  @IsOptional()
  @IsString()
  excludeOneOffSlotId?: string;

  @IsOptional()
  @IsString()
  excludeExceptionId?: string;
}
