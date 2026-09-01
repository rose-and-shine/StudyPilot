import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsNotEmpty()
  @IsUUID()
  subjectId: string;
}
