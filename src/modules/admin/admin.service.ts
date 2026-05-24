import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, CarStatus, BookingStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardAnalytics() {
    const [
      totalUsers,
      totalAdmins,
      totalCars,
      carsByStatus,
      totalBookings,
      bookingsByStatus,
      revenueGroup,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.car.count(),
      this.prisma.car.groupBy({
        by: ['status'],
        _count: true,
        orderBy: {
          status: 'asc',
        },
      }),
      this.prisma.booking.count(),
      this.prisma.booking.groupBy({
        by: ['bookingStatus'],
        _count: true,
        orderBy: {
          bookingStatus: 'asc',
        },
      }),
      this.prisma.booking.aggregate({
        where: {
          bookingStatus: BookingStatus.CONFIRMED,
        },
        _sum: {
          bookingAmount: true,
        },
      }),
    ]);

    // Format stats helper
    const carStats = {
      total: totalCars,
      available: carsByStatus.find((c) => c.status === CarStatus.AVAILABLE)?._count || 0,
      booked: carsByStatus.find((c) => c.status === CarStatus.BOOKED)?._count || 0,
      maintenance: carsByStatus.find((c) => c.status === CarStatus.MAINTENANCE)?._count || 0,
    };

    const bookingStats = {
      total: totalBookings,
      pending: bookingsByStatus.find((b) => b.bookingStatus === BookingStatus.PENDING)?._count || 0,
      confirmed: bookingsByStatus.find((b) => b.bookingStatus === BookingStatus.CONFIRMED)?._count || 0,
      cancelled: bookingsByStatus.find((b) => b.bookingStatus === BookingStatus.CANCELLED)?._count || 0,
    };

    const revenue = revenueGroup._sum.bookingAmount || 0;

    // Retrieve recent bookings
    const recentBookings = await this.prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        car: {
          select: { brand: true, model: true, year: true, price: true },
        },
      },
    });

    return {
      users: {
        customers: totalUsers,
        admins: totalAdmins,
        total: totalUsers + totalAdmins,
      },
      cars: carStats,
      bookings: bookingStats,
      revenue,
      recentBookings,
    };
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateUserRole(targetUserId: string, actorUserId: string, role: Role) {
    if (targetUserId === actorUserId) {
      throw new BadRequestException('You cannot change your own role.');
    }
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }
}
