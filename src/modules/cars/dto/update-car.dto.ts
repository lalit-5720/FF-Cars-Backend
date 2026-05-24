import { IsString, IsInt, IsNumber, IsOptional, IsEnum, IsArray, Min } from 'class-validator';
import { CarStatus } from '@prisma/client';

export class UpdateCarDto {
  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  variant?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsString()
  transmission?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  kmDriven?: number;

  @IsOptional()
  @IsString()
  ownership?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
