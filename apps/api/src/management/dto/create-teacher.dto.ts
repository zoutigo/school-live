import { IsEmail } from "class-validator";

export class CreateTeacherDto {
  @IsEmail()
  email!: string;
}
