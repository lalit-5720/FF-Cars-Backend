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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AdminService = class AdminService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardAnalytics() {
        const [totalUsers, totalAdmins, totalCars, carsByStatus, totalBookings, bookingsByStatus, revenueGroup,] = await this.prisma.$transaction([
            this.prisma.user.count({ where: { role: client_1.Role.CUSTOMER } }),
            this.prisma.user.count({ where: { role: client_1.Role.ADMIN } }),
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
                    bookingStatus: client_1.BookingStatus.CONFIRMED,
                },
                _sum: {
                    bookingAmount: true,
                },
            }),
        ]);
        const carStats = {
            total: totalCars,
            available: carsByStatus.find((c) => c.status === client_1.CarStatus.AVAILABLE)?._count || 0,
            booked: carsByStatus.find((c) => c.status === client_1.CarStatus.BOOKED)?._count || 0,
            maintenance: carsByStatus.find((c) => c.status === client_1.CarStatus.MAINTENANCE)?._count || 0,
        };
        const bookingStats = {
            total: totalBookings,
            pending: bookingsByStatus.find((b) => b.bookingStatus === client_1.BookingStatus.PENDING)?._count || 0,
            confirmed: bookingsByStatus.find((b) => b.bookingStatus === client_1.BookingStatus.CONFIRMED)?._count || 0,
            cancelled: bookingsByStatus.find((b) => b.bookingStatus === client_1.BookingStatus.CANCELLED)?._count || 0,
        };
        const revenue = revenueGroup._sum.bookingAmount || 0;
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
    async updateUserRole(targetUserId, actorUserId, role) {
        if (targetUserId === actorUserId) {
            throw new common_1.BadRequestException('You cannot change your own role.');
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
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map