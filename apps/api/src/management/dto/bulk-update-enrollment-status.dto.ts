import { EnrollmentStatus } from "@prisma/client";
import { IsArray, IsEnum, IsString } from "class-validator";

export class BulkUpdateEnrollmentStatusDto {
  @IsArray()
  @IsString({ each: true })
  enrollmentIds!: string[];

  @IsEnum(EnrollmentStatus)
  status!: EnrollmentStatus;
}
