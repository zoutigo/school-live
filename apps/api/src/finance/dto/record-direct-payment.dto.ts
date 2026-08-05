import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from "class-validator";

export class RecordDirectPaymentDto {
  @IsString()
  studentId!: string;

  @IsString()
  schoolYearId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  paidAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
