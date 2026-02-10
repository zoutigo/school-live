import { IsOptional, IsString } from 'class-validator';

export class UpdateClassGroupDto {
  @IsOptional()
  @IsString()
  name?: string;
}
