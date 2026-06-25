import { IsOptional, IsString } from 'class-validator';

export class FindBookingsQueryDto {
  @IsOptional()
  @IsString()
  all?: string;
}
