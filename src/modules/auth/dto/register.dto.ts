import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
