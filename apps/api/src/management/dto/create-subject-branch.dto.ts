import { IsOptional, IsString } from "class-validator";

export class CreateSubjectBranchDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;
}
