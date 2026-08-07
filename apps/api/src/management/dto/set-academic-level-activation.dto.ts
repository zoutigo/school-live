import { IsBoolean } from "class-validator";

export class SetAcademicLevelActivationDto {
  @IsBoolean()
  activated!: boolean;
}
