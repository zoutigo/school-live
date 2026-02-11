import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateSchoolYearDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
