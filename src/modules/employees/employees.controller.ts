import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId?: number,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    return this.employeesService.findAll({ branchId: effectiveBranchId, role, search });
  }

  @Get(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @Roles(Role.SYSTEM_ADMIN)
  create(@Body() data: Prisma.employeesCreateInput) {
    return this.employeesService.create(data);
  }

  @Patch(':id')
  @Roles(Role.SYSTEM_ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.employeesUpdateInput,
  ) {
    return this.employeesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.SYSTEM_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.remove(id);
  }
}

