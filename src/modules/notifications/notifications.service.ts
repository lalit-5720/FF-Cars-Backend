import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { BookingsService } from '../bookings/bookings.service';
import { Notification, Car } from '@prisma/client';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    @Inject(forwardRef(() => BookingsService))
    private bookingsService: BookingsService,
  ) {}

  onModuleInit() {
    // Register listeners with BookingsService to handle real-time notification generation asynchronously
    this.bookingsService.registerCallbacks(
      async (booking, car) => {
        // Customer Alert
        await this.createNotification(
          booking.userId,
          `Your test ride request for ${car.brand} ${car.model} is pending confirmation. Amount: ₹${car.price.toLocaleString()}`,
        );

        // Admin Alert
        // Fetch all admins to notify
        const admins = await this.prisma.user.findMany({
          where: { role: 'ADMIN' },
        });
        for (const admin of admins) {
          await this.createNotification(
            admin.id,
            `New Test Ride Request: User ${booking.userId} requested a test ride for ${car.brand} ${car.model}.`,
          );
        }

        // Live availability update broadcast to all active marketplace shoppers
        this.gateway.broadcast('car_availability_updated', {
          carId: car.id,
          status: car.status,
        });
      },
      async (booking, car) => {
        // Customer Alert
        await this.createNotification(
          booking.userId,
          `Your test ride request for ${car.brand} ${car.model} has been cancelled.`,
        );

        // Broadcast release of lock
        this.gateway.broadcast('car_availability_updated', {
          carId: car.id,
          status: car.status,
        });
      },
      async (booking, car) => {
        // Customer Alert for confirmation
        await this.createNotification(
          booking.userId,
          `Your test ride/booking for ${car.brand} ${car.model} has been confirmed. Payment status: PAID.`,
        );

        // Broadcast booking/sold out status to all active marketplace shoppers
        this.gateway.broadcast('car_availability_updated', {
          carId: car.id,
          status: car.status,
        });
      },
    );
  }

  async createNotification(userId: string, message: string): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        message,
      },
    });

    // Push via Socket.IO
    this.gateway.sendToUser(userId, 'notification', notification);

    return notification;
  }

  async findAllForUser(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id, userId },
      data: { readStatus: true },
    });
  }

  async markAllAsRead(userId: string): Promise<any> {
    return this.prisma.notification.updateMany({
      where: { userId, readStatus: false },
      data: { readStatus: true },
    });
  }
}
