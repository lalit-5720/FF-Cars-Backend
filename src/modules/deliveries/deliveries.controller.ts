import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('deliveries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  findAll(
    @Query('saleId') saleId?: number,
    @Query('deliveryStatus') deliveryStatus?: string,
    @Query('deliveredBy') deliveredBy?: number,
  ) {
    return this.deliveriesService.findAll({ saleId, deliveryStatus, deliveredBy });
  }

  @Get(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.findOne(id);
  }

  @Post()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  create(@Body() data: Prisma.deliveriesCreateInput) {
    return this.deliveriesService.create(data);
  }

  @Patch(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.deliveriesUpdateInput,
  ) {
    return this.deliveriesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.SYSTEM_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.remove(id);
  }
}

