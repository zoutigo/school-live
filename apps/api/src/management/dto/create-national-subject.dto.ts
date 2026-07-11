import { IsString } from "class-validator";

export class CreateNationalSubjectDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;
}
