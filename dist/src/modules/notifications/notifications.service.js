"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_gateway_1 = require("./notifications.gateway");
const bookings_service_1 = require("../bookings/bookings.service");
let NotificationsService = class NotificationsService {
    prisma;
    gateway;
    bookingsService;
    constructor(prisma, gateway, bookingsService) {
        this.prisma = prisma;
        this.gateway = gateway;
        this.bookingsService = bookingsService;
    }
    onModuleInit() {
        this.bookingsService.registerCallbacks(async (booking, car) => {
            await this.createNotification(booking.userId, `Your test ride request for ${car.brand} ${car.model} is pending confirmation. Amount: ₹${car.price.toLocaleString()}`);
            const admins = await this.prisma.user.findMany({
                where: { role: 'ADMIN' },
            });
            for (const admin of admins) {
                await this.createNotification(admin.id, `New Test Ride Request: User ${booking.userId} requested a test ride for ${car.brand} ${car.model}.`);
            }
            this.gateway.broadcast('car_availability_updated', {
                carId: car.id,
                status: car.status,
            });
        }, async (booking, car) => {
            await this.createNotification(booking.userId, `Your test ride request for ${car.brand} ${car.model} has been cancelled.`);
            this.gateway.broadcast('car_availability_updated', {
                carId: car.id,
                status: car.status,
            });
        }, async (booking, car) => {
            await this.createNotification(booking.userId, `Your test ride/booking for ${car.brand} ${car.model} has been confirmed. Payment status: PAID.`);
            this.gateway.broadcast('car_availability_updated', {
                carId: car.id,
                status: car.status,
            });
        });
    }
    async createNotification(userId, message) {
        const notification = await this.prisma.notification.create({
            data: {
                userId,
                message,
            },
        });
        this.gateway.sendToUser(userId, 'notification', notification);
        return notification;
    }
    async findAllForUser(userId) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async markAsRead(id, userId) {
        return this.prisma.notification.update({
            where: { id, userId },
            data: { readStatus: true },
        });
    }
    async markAllAsRead(userId) {
        return this.prisma.notification.updateMany({
            where: { userId, readStatus: false },
            data: { readStatus: true },
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => bookings_service_1.BookingsService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_gateway_1.NotificationsGateway,
        bookings_service_1.BookingsService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map