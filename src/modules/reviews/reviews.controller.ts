import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
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
  getApprovalSummary() {
    return this.reviewsService.getApprovalSummary();
  }

  @Patch(':id/publish')
  togglePublish(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { is_published?: boolean },
  ) {
    return this.reviewsService.togglePublish(id, body?.is_published);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.remove(id);
  }
}
