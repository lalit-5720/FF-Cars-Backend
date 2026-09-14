import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE, Role.CUSTOMER)
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.branchesService.findOne(id);
  }

  @Post()
  @Roles(Role.SYSTEM_ADMIN)
  create(@Body() data: Prisma.branchesCreateInput) {
    return this.branchesService.create(data);
  }

  @Patch(':id')
  @Roles(Role.SYSTEM_ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.branchesUpdateInput,
  ) {
    return this.branchesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.SYSTEM_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.branchesService.remove(id);
  }
}

