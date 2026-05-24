import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ToggleWishlistDto } from './dto/toggle-wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async toggleWishlist(userId: string, toggleDto: ToggleWishlistDto): Promise<{ added: boolean }> {
    const { carId } = toggleDto;

    // Verify car exists
    const car = await this.prisma.car.findUnique({ where: { id: carId } });
    if (!car) {
      throw new NotFoundException(`Car with ID ${carId} not found`);
    }

    // Check if already wishlisted
    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_carId: { userId, carId },
      },
    });

    if (existing) {
      await this.prisma.wishlist.delete({
        where: {
          userId_carId: { userId, carId },
        },
      });
      return { added: false };
    } else {
      await this.prisma.wishlist.create({
        data: { userId, carId },
      });
      return { added: true };
    }
  }

  async getWishlist(userId: string): Promise<any[]> {
    const list = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        car: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
    return list.map((item) => item.car);
  }

  async checkWishlistStatus(userId: string, carId: string): Promise<{ wishlisted: boolean }> {
    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_carId: { userId, carId },
      },
    });
    return { wishlisted: !!existing };
  }
}
