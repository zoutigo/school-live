import { IsBoolean } from "class-validator";

export class ArchiveMessageDto {
  @IsBoolean()
  archived!: boolean;
}
