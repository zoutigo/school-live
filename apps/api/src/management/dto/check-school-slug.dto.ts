import { IsString } from 'class-validator';

export class CheckSchoolSlugDto {
  @IsString()
  name!: string;
}
