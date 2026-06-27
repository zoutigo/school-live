import { IsEmail } from "class-validator";

export class RequestEmailChangeDto {
  @IsEmail({}, { message: "Adresse email invalide." })
  email!: string;
}
