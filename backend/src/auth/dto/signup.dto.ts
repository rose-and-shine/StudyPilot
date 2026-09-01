import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class SignupDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  @Matches(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()[\]{}_\-+=.,:;"'<>/\\|`~]).+$/,
  {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
  },)
  password: string;
}
