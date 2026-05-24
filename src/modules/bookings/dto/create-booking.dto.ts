import { IsString, IsNotEmpty } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  carId: string;
}
