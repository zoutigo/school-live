import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateStudentAdmissionDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsString()
  academicLevelId!: string;

  @IsOptional()
  @IsString()
  trackId?: string;

  @IsOptional()
  @IsString()
  schoolYearId?: string;
}
