import { IsOptional, IsString, Matches } from "class-validator";

export class SetClassSubjectStyleDto {
  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "colorHex must be a valid hex color like #1A73E8",
  })
  colorHex!: string;
}
