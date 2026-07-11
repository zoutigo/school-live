import { IsEmail } from "class-validator";

export class AddSchoolAdminDto {
  @IsEmail()
  email!: string;
}
