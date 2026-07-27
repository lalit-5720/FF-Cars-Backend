import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { Prisma } from '@prisma/client';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(
    @Query('make') make?: string,
    @Query('model') model?: string,
    @Query('fuelType') fuelType?: string,
    @Query('transmission') transmission?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: number,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('search') search?: string,
  ) {
    return this.vehiclesService.findAll({
      make,
      model,
      fuelType,
      transmission,
      status,
      branchId,
      minPrice,
      maxPrice,
      search,
    });
  }

  @Get('stats')
  getStats() {
    return this.vehiclesService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  create(@Body() data: Prisma.vehiclesCreateInput) {
    return this.vehiclesService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.vehiclesUpdateInput,
  ) {
    return this.vehiclesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.remove(id);
  }
}
