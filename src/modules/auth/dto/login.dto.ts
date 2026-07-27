import { IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  password?: string;
}
