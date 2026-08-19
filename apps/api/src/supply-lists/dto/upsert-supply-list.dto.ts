import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class SupplyItemInputDto {
  @IsInt()
  @Min(1)
  rank!: number;

  @IsString()
  @MaxLength(160)
  label!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}

export class UpsertSupplyListDto {
  @IsString()
  schoolYearId!: string;

  @IsString()
  academicLevelId!: string;

  @IsOptional()
  @IsString()
  trackId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplyItemInputDto)
  items!: SupplyItemInputDto[];
}
