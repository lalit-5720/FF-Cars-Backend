import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TestDrivesService } from './test-drives.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';

@Controller('test-drives')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestDrivesController {
  constructor(private readonly testDrivesService: TestDrivesService) {}

  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE, Role.CUSTOMER)
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('status') status?: string,
    @Query('customerId') customerId?: number,
    @Query('vehicleId') vehicleId?: number,
    @Query('branchId') branchId?: number,
    @Query('email') email?: string,
  ) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    const effectiveCustomerId = user.role === Role.CUSTOMER ? user.id : customerId;
    return this.testDrivesService.findAll({ status, customerId: effectiveCustomerId, vehicleId, branchId: effectiveBranchId, email });
  }

  @Get(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE, Role.CUSTOMER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.testDrivesService.findOne(id);
  }

  @Post()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE, Role.CUSTOMER)
  create(@Body() data: Prisma.test_drivesCreateInput) {
    return this.testDrivesService.create(data);
  }

  @Patch(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE, Role.CUSTOMER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.test_drivesUpdateInput,
  ) {
    return this.testDrivesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.testDrivesService.remove(id);
  }
}

