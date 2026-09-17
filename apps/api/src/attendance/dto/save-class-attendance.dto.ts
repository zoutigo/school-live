import { ArrayUnique, IsArray, IsDateString, IsString } from "class-validator";

export class SaveClassAttendanceDto {
  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  absentStudentIds!: string[];
}
