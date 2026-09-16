import { IsDateString } from "class-validator";

export class GetClassAttendanceQueryDto {
  @IsDateString()
  date!: string;
}
