import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateContactInfoDto {
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  addressStreet!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  addressDistrict?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  addressCity!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  addressCountry!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  legalRepresentativeFirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  legalRepresentativeLastName?: string;
}
