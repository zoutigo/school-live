import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class FeeInstallmentInputDto {
  @IsInt()
  @Min(1)
  rank!: number;

  @IsString()
  @MaxLength(120)
  label!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpsertFeeScheduleDto {
  @IsString()
  schoolYearId!: string;

  @IsString()
  academicLevelId!: string;

  @IsOptional()
  @IsString()
  trackId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeInstallmentInputDto)
  installments!: FeeInstallmentInputDto[];
}
