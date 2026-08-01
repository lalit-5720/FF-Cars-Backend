import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { TestDrivesService } from './test-drives.service';
import { Prisma } from '@prisma/client';

@Controller('test-drives')
export class TestDrivesController {
  constructor(private readonly testDrivesService: TestDrivesService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('customerId') customerId?: number,
    @Query('vehicleId') vehicleId?: number,
    @Query('branchId') branchId?: number,
    @Query('email') email?: string,
  ) {
    return this.testDrivesService.findAll({ status, customerId, vehicleId, branchId, email });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.testDrivesService.findOne(id);
  }

  @Post()
  create(@Body() data: Prisma.test_drivesCreateInput) {
    return this.testDrivesService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.test_drivesUpdateInput,
  ) {
    return this.testDrivesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.testDrivesService.remove(id);
  }
}
