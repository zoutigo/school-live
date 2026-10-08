import { IsNotEmpty, IsString } from "class-validator";

export class ReplacePrimaryAdminDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
