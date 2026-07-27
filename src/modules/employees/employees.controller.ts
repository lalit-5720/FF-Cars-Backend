import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { Prisma } from '@prisma/client';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(
    @Query('branchId') branchId?: number,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.employeesService.findAll({ branchId, role, search });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.findOne(id);
  }

  @Post()
  create(@Body() data: Prisma.employeesCreateInput) {
    return this.employeesService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.employeesUpdateInput,
  ) {
    return this.employeesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.remove(id);
  }
}
