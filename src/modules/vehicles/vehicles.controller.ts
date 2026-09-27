import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  create(@Request() req: any, @Body() data: any) {
    // Managers only add vehicles to their assigned branch; admins have all access
    if (req.user?.role === Role.BRANCH_MANAGER && req.user?.branch_id) {
      data.branch_id = req.user.branch_id;
    }
    return this.vehiclesService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.vehiclesUpdateInput,
  ) {
    return this.vehiclesService.update(id, data);
  }

  @Patch(':id/inspection')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  updateInspection(
    @Param('id', ParseIntPipe) id: number,
    @Body('inspectionReport') inspectionReport: any,
  ) {
    return this.vehiclesService.updateInspectionReport(id, inspectionReport);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.remove(id);
  }
}

