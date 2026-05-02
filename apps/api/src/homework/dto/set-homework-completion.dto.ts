import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SetHomeworkCompletionDto {
  @Type(() => Boolean)
  @IsBoolean()
  done!: boolean;

  @IsOptional()
  @IsString()
  studentId?: string;
}
