import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { Prisma } from '@prisma/client';

@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  findAll(
    @Query('saleId') saleId?: number,
    @Query('deliveryStatus') deliveryStatus?: string,
    @Query('deliveredBy') deliveredBy?: number,
  ) {
    return this.deliveriesService.findAll({ saleId, deliveryStatus, deliveredBy });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.findOne(id);
  }

  @Post()
  create(@Body() data: Prisma.deliveriesCreateInput) {
    return this.deliveriesService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.deliveriesUpdateInput,
  ) {
    return this.deliveriesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.remove(id);
  }
}
