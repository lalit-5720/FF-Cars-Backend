import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  create(@Body() data: { customer_id?: number; customerId?: number; vehicle_id?: number; vehicleId?: number; rating?: number; comment: string }) {
    return this.reviewsService.create(data);
  }

  @Get()
  findAll() {
    return this.reviewsService.findAll();
  }

  @Get('published')
  findPublished() {
    return this.reviewsService.findPublished();
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  getApprovalSummary() {
    return this.reviewsService.getApprovalSummary();
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  togglePublish(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { is_published?: boolean },
  ) {
    return this.reviewsService.togglePublish(id, body?.is_published);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.remove(id);
  }
}

