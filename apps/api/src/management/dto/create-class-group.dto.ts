import { IsString } from 'class-validator';

export class CreateClassGroupDto {
  @IsString()
  name!: string;
}
