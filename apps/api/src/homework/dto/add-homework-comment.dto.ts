import { IsOptional, IsString } from "class-validator";

export class AddHomeworkCommentDto {
  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  studentId?: string;
}
