import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SearchDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  query: string;
}
