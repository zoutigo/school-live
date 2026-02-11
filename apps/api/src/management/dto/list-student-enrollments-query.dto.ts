import { EnrollmentStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class ListStudentEnrollmentsQueryDto {
  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
