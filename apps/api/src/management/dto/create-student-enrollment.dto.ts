import { EnrollmentStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateStudentEnrollmentDto {
  @IsString()
  classId!: string;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
