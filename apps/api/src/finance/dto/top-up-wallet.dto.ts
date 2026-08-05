import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from "class-validator";

export class TopUpWalletDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
