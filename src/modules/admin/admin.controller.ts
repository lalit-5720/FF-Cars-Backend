import { Controller, Get, UseGuards, Patch, Param, Body, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics')
  getAnalytics() {
    return this.adminService.getDashboardAnalytics();
  }

  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('users/:id/role')
  updateUserRole(
    @Param('id') id: string,
    @Body('role') role: Role,
    @Req() req: any,
  ) {
    return this.adminService.updateUserRole(id, req.user.id, role);
  }
}
