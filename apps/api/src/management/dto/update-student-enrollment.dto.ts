import { EnrollmentStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

export class UpdateStudentEnrollmentDto {
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
