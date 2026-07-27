import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class ListRoomsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(["AVAILABLE", "UNAVAILABLE", "MAINTENANCE"])
  status?: "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE";

  @IsOptional()
  @IsIn(["SINGLE", "MULTIPLE"])
  simultaneity?: "SINGLE" | "MULTIPLE";

  // Disponibilité : une seule date (availabilityToDate omis), ou une plage de
  // dates (la salle doit être libre pour la plage horaire donnée sur CHAQUE
  // jour de la plage). Plage horaire optionnelle (par défaut journée entière).
  @IsOptional()
  @IsDateString()
  availabilityFromDate?: string;

  @IsOptional()
  @IsDateString()
  availabilityToDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  availabilityStartMinute?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  availabilityEndMinute?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
