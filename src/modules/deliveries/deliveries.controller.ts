import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseGuards, ForbiddenException } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';

@Controller('deliveries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('saleId') saleId?: number,
    @Query('deliveryStatus') deliveryStatus?: string,
    @Query('deliveredBy') deliveredBy?: number,
  ) {
    // If SALES_EXECUTIVE, strictly enforce scoping to deliveries assigned to them or their closed sales!
    const effectiveEmployeeId = user.role === Role.SALES_EXECUTIVE ? user.id : undefined;
    const effectiveBranchId = user.role === Role.BRANCH_MANAGER ? (user.branch_id ?? undefined) : undefined;
    const effectiveDeliveredBy = user.role === Role.SALES_EXECUTIVE ? undefined : (deliveredBy ? Number(deliveredBy) : undefined);

    return this.deliveriesService.findAll({
      saleId: saleId ? Number(saleId) : undefined,
      deliveryStatus,
      deliveredBy: effectiveDeliveredBy,
      employeeId: effectiveEmployeeId,
      branchId: effectiveBranchId,
    });
  }

  @Get(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
  async findOne(@CurrentUser() user: UserPayload, @Param('id', ParseIntPipe) id: number) {
    const delivery = await this.deliveriesService.findOne(id);
    if (user.role === Role.SALES_EXECUTIVE) {
      const isDeliveredBy = delivery.delivered_by === user.id;
      const isSalesExec = delivery.sales?.employee_id === user.id;
      if (!isDeliveredBy && !isSalesExec) {
        throw new ForbiddenException('You do not have permission to view this delivery record.');
      }
    }
    return delivery;
  }

  @Post()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
  create(@CurrentUser() user: UserPayload, @Body() data: Prisma.deliveriesCreateInput | any) {
    if (user.role === Role.SALES_EXECUTIVE) {
      data.delivered_by = user.id;
    }
    return this.deliveriesService.create(data);
  }

  @Patch(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
  async update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.deliveriesUpdateInput,
  ) {
    if (user.role === Role.SALES_EXECUTIVE) {
      const delivery = await this.deliveriesService.findOne(id);
      const isDeliveredBy = delivery.delivered_by === user.id;
      const isSalesExec = delivery.sales?.employee_id === user.id;
      if (!isDeliveredBy && !isSalesExec) {
        throw new ForbiddenException('You do not have permission to modify this delivery record.');
      }
    }
    return this.deliveriesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.SYSTEM_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.remove(id);
  }
}

