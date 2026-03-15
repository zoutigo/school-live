import { IsOptional, IsString } from "class-validator";

export class UpdateSubjectBranchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;
}
