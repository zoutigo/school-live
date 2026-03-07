import { IsIn, IsString, MinLength } from "class-validator";

export class UpdatePersonalProfileDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsIn(["M", "F", "OTHER"])
  gender!: "M" | "F" | "OTHER";

  @IsString()
  @MinLength(6)
  phone!: string;
}
