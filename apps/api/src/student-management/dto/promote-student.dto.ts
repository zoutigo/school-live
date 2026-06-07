import { IsOptional, IsString } from "class-validator";

export class PromoteStudentDto {
  @IsOptional()
  @IsString()
  username?: string;
}
