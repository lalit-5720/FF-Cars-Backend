import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  findAll(
    @Query('saleId') saleId?: number,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.paymentsService.findAll({ saleId, paymentMethod, paymentStatus });
  }

  @Get(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }

  @Post()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  create(@Body() data: Prisma.paymentsCreateInput) {
    return this.paymentsService.create(data);
  }

  @Patch(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.paymentsUpdateInput,
  ) {
    return this.paymentsService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.SYSTEM_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.remove(id);
  }
}

