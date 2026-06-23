import { IsDateString } from "class-validator";

export class GetRoomCalendarQueryDto {
  @IsDateString()
  fromDate!: string;

  @IsDateString()
  toDate!: string;
}
