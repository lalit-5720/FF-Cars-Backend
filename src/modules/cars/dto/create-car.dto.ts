import { IsString, IsInt, IsNumber, IsOptional, IsEnum, IsArray, Min } from 'class-validator';
import { CarStatus } from '@prisma/client';

export class CreateCarDto {
  @IsString()
  brand: string;

  @IsString()
  model: string;

  @IsString()
  variant: string;

  @IsInt()
  @Min(1900)
  year: number;

  @IsString()
  fuelType: string;

  @IsString()
  transmission: string;

  @IsInt()
  @Min(0)
  kmDriven: number;

  @IsString()
  ownership: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;

  @IsString()
  thumbnail: string;

  @IsArray()
  @IsString({ each: true })
  images: string[];
}
