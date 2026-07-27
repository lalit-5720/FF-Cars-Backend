import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Prisma } from '@prisma/client';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(
    @Query('saleId') saleId?: number,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.paymentsService.findAll({ saleId, paymentMethod, paymentStatus });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }

  @Post()
  create(@Body() data: Prisma.paymentsCreateInput) {
    return this.paymentsService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.paymentsUpdateInput,
  ) {
    return this.paymentsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.remove(id);
  }
}
