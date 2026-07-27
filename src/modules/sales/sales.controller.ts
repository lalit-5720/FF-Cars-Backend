import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { SalesService } from './sales.service';
import { Prisma } from '@prisma/client';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll(
    @Query('branchId') branchId?: number,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('deliveryStatus') deliveryStatus?: string,
    @Query('employeeId') employeeId?: number,
    @Query('customerId') customerId?: number,
  ) {
    return this.salesService.findAll({
      branchId,
      paymentStatus,
      deliveryStatus,
      employeeId,
      customerId,
    });
  }

  @Get('revenue-stats')
  getRevenueStats() {
    return this.salesService.getRevenueStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }

  @Post()
  create(@Body() data: Prisma.salesCreateInput) {
    return this.salesService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.salesUpdateInput,
  ) {
    return this.salesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.remove(id);
  }
}
