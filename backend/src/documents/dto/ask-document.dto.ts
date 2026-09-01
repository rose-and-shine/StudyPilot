import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AskDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;
}
