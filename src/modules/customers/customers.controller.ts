import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  findAll(@Query('city') city?: string, @Query('search') search?: string) {
    return this.customersService.findAll({ city, search });
  }

  @Get(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE, Role.CUSTOMER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Post()
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  create(@Body() data: Prisma.customersCreateInput) {
    return this.customersService.create(data);
  }

  @Patch(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.CUSTOMER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.customersUpdateInput,
  ) {
    return this.customersService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.SYSTEM_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.remove(id);
  }
}

