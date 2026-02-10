import { IsString } from 'class-validator';

export class CreateClassroomDto {
  @IsString()
  classGroupId!: string;

  @IsString()
  name!: string;

  @IsString()
  year!: string;
}
