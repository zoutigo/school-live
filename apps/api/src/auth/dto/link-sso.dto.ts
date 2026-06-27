import { IsEmail, IsIn, IsNotEmpty, IsString } from "class-validator";

export class LinkSsoDto {
  @IsIn(["GOOGLE", "APPLE"], { message: "Fournisseur SSO invalide." })
  provider!: "GOOGLE" | "APPLE";

  @IsString()
  @IsNotEmpty({ message: "L'identifiant de compte SSO est obligatoire." })
  providerAccountId!: string;

  @IsEmail({}, { message: "Adresse email invalide." })
  email!: string;
}
