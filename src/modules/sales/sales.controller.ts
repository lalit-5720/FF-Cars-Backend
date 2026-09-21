import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseGuards, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('my-purchases')
  @Roles(Role.CUSTOMER, Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
  getMyPurchases(@CurrentUser() user: UserPayload) {
    return this.salesService.findAll({ customerId: user.id });
  }

  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE, Role.CUSTOMER)
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId?: number,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('deliveryStatus') deliveryStatus?: string,
    @Query('employeeId') employeeId?: number,
    @Query('customerId') customerId?: number,
  ) {
    if (user.role === Role.CUSTOMER) {
      return this.salesService.findAll({ customerId: user.id });
    }
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    const effectiveEmployeeId = user.role === Role.SALES_EXECUTIVE ? user.id : employeeId;
    return this.salesService.findAll({
      branchId: effectiveBranchId,
      paymentStatus,
      deliveryStatus,
      employeeId: effectiveEmployeeId,
      customerId,
    });
  }

  @Get('revenue-stats')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
  getRevenueStats() {
    return this.salesService.getRevenueStats();
  }

  @Get(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE, Role.CUSTOMER)
  async findOne(@CurrentUser() user: UserPayload, @Param('id', ParseIntPipe) id: number) {
    const sale = await this.salesService.findOne(id);
    if (user.role === Role.CUSTOMER && sale.customer_id !== user.id) {
      throw new NotFoundException('Sale not found');
    }
    return sale;
  }

  @Post()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
  create(@Body() data: Prisma.salesCreateInput) {
    return this.salesService.create(data);
  }

  @Patch(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.salesUpdateInput,
  ) {
    return this.salesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.remove(id);
  }
}

