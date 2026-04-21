import { IsString, Matches, MinLength } from "class-validator";

export class AddPhoneCredentialDto {
  @IsString()
  @MinLength(6, { message: "Numero de telephone invalide." })
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: "Le PIN doit contenir exactement 6 chiffres.",
  })
  pin!: string;
}
