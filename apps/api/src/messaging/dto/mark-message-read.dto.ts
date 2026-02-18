import { IsBoolean } from "class-validator";

export class MarkMessageReadDto {
  @IsBoolean()
  read!: boolean;
}
