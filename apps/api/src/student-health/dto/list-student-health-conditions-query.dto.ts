import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import {
  StudentHealthAlertLevel,
  StudentHealthConditionType,
} from "@prisma/client";

export class ListStudentHealthConditionsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(StudentHealthConditionType)
  type?: StudentHealthConditionType;

  @IsOptional()
  @IsEnum(StudentHealthAlertLevel)
  alertLevel?: StudentHealthAlertLevel;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
