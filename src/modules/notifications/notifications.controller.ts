import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.notificationsService.findAllForUser(req.user.id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }
}
