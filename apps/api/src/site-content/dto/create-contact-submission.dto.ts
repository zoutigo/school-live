import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateContactSubmissionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(180)
  email!: string;

  // Même format que le login par téléphone : 9 chiffres locaux, sans
  // l'indicatif pays (voir normalizePhoneInput côté web).
  @IsString()
  @Matches(/^\d{9}$/, {
    message: "Numero de telephone invalide (9 chiffres attendus).",
  })
  phone!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(150)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message!: string;

  // Honeypot : champ invisible pour un humain, rempli uniquement par des
  // bots. Toute valeur non vide fait échouer la soumission silencieusement
  // (voir ContactSubmissionService.create).
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
