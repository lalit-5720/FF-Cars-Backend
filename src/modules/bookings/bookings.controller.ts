import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@Req() req: any, @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.createBooking(req.user.id, createBookingDto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.bookingsService.findAll(req.user.id, req.user.role);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.bookingsService.findOne(id, req.user.id, req.user.role);
  }

  @Post(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.bookingsService.cancelBooking(id, req.user.id, req.user.role);
  }

  @Post(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  confirm(@Param('id') id: string) {
    return this.bookingsService.confirmBooking(id);
  }
}
