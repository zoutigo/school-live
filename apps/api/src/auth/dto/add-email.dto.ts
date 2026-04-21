import { IsEmail } from "class-validator";

export class AddEmailDto {
  @IsEmail({}, { message: "Adresse email invalide." })
  email!: string;
}
