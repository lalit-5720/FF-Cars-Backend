import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('my-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALES_EXECUTIVE, Role.BRANCH_MANAGER, Role.SYSTEM_ADMIN)
  getMyStats(@CurrentUser() user: UserPayload, @Query('employeeId') employeeId?: number) {
    const targetId = user.role === Role.SALES_EXECUTIVE ? user.id : (employeeId ? Number(employeeId) : user.id);
    return this.leadsService.getEmployeeLeadStats(targetId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('status') status?: string,
    @Query('interestLevel') interestLevel?: string,
    @Query('source') source?: string,
    @Query('employeeId') employeeId?: number,
  ) {
    // If SALES_EXECUTIVE, strictly enforce scoping to their assigned leads only!
    const effectiveEmployeeId = user.role === Role.SALES_EXECUTIVE ? user.id : employeeId;
    const effectiveBranchId = user.role === Role.BRANCH_MANAGER ? (user.branch_id ?? undefined) : undefined;

    return this.leadsService.findAll({
      status,
      interestLevel,
      source,
      employeeId: effectiveEmployeeId,
      branchId: effectiveBranchId,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.findOne(id);
  }

  @Post()
  create(@Body() data: Prisma.leadsCreateInput) {
    return this.leadsService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.leadsUpdateInput,
  ) {
    return this.leadsService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.remove(id);
  }
}

