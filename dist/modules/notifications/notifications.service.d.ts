import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { BookingsService } from '../bookings/bookings.service';
import { Notification } from '@prisma/client';
export declare class NotificationsService implements OnModuleInit {
    private prisma;
    private gateway;
    private bookingsService;
    constructor(prisma: PrismaService, gateway: NotificationsGateway, bookingsService: BookingsService);
    onModuleInit(): void;
    createNotification(userId: string, message: string): Promise<Notification>;
    findAllForUser(userId: string): Promise<Notification[]>;
    markAsRead(id: string, userId: string): Promise<Notification>;
    markAllAsRead(userId: string): Promise<any>;
}
