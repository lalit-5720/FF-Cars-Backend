import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { ToggleWishlistDto } from './dto/toggle-wishlist.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  toggle(@Req() req: any, @Body() toggleDto: ToggleWishlistDto) {
    return this.wishlistService.toggleWishlist(req.user.id, toggleDto);
  }

  @Get()
  getWishlist(@Req() req: any) {
    return this.wishlistService.getWishlist(req.user.id);
  }

  @Get('check/:carId')
  check(@Req() req: any, @Param('carId') carId: string) {
    return this.wishlistService.checkWishlistStatus(req.user.id, carId);
  }
}
