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
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let BookingsService = class BookingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    onBookingCreatedCallback = () => { };
    onBookingCancelledCallback = () => { };
    onBookingConfirmedCallback = () => { };
    registerCallbacks(onCreated, onCancelled, onConfirmed) {
        this.onBookingCreatedCallback = onCreated;
        this.onBookingCancelledCallback = onCancelled;
        this.onBookingConfirmedCallback = onConfirmed;
    }
    async createBooking(userId, createBookingDto) {
        const { carId } = createBookingDto;
        const result = await this.prisma.$transaction(async (tx) => {
            const cars = await tx.$queryRaw `
        SELECT * FROM cars WHERE id = ${carId} FOR UPDATE
      `;
            if (!cars || cars.length === 0) {
                throw new common_1.NotFoundException(`Car with ID ${carId} not found`);
            }
            const car = cars[0];
            if (car.status !== client_1.CarStatus.AVAILABLE) {
                throw new common_1.BadRequestException('Car is already booked or unavailable');
            }
            const booking = await tx.booking.create({
                data: {
                    userId,
                    carId,
                    bookingStatus: client_1.BookingStatus.PENDING,
                    paymentStatus: client_1.PaymentStatus.PENDING,
                    bookingAmount: car.price,
                },
            });
            return { booking, car };
        });
        if (result && result.booking) {
            this.onBookingCreatedCallback(result.booking, result.car);
        }
        return result.booking;
    }
    async findAll(userId, role, allBookings = false) {
        if (allBookings && role === client_1.Role.ADMIN) {
            return this.prisma.booking.findMany({
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                    car: true,
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        return this.prisma.booking.findMany({
            where: { userId },
            include: {
                car: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, userId, role) {
        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
                car: true,
            },
        });
        if (!booking) {
            throw new common_1.NotFoundException(`Booking with ID ${id} not found`);
        }
        if (role !== client_1.Role.ADMIN && booking.userId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to view this booking');
        }
        return booking;
    }
    async cancelBooking(id, userId, role) {
        const result = await this.prisma.$transaction(async (tx) => {
            const booking = await tx.booking.findUnique({
                where: { id },
            });
            if (!booking) {
                throw new common_1.NotFoundException(`Booking with ID ${id} not found`);
            }
            if (role !== client_1.Role.ADMIN && booking.userId !== userId) {
                throw new common_1.ForbiddenException('You cannot cancel this booking');
            }
            if (booking.bookingStatus === client_1.BookingStatus.CANCELLED) {
                throw new common_1.BadRequestException('Booking is already cancelled');
            }
            const updatedBooking = await tx.booking.update({
                where: { id },
                data: {
                    bookingStatus: client_1.BookingStatus.CANCELLED,
                    paymentStatus: booking.paymentStatus === client_1.PaymentStatus.PAID ? client_1.PaymentStatus.REFUNDED : client_1.PaymentStatus.FAILED,
                },
            });
            const updatedCar = await tx.car.update({
                where: { id: booking.carId },
                data: { status: client_1.CarStatus.AVAILABLE },
            });
            return { booking: updatedBooking, car: updatedCar };
        });
        if (result && result.booking) {
            this.onBookingCancelledCallback(result.booking, result.car);
        }
        return result.booking;
    }
    async confirmBooking(id) {
        const result = await this.prisma.$transaction(async (tx) => {
            const booking = await tx.booking.findUnique({
                where: { id },
                include: { car: true },
            });
            if (!booking) {
                throw new common_1.NotFoundException(`Booking with ID ${id} not found`);
            }
            if (booking.bookingStatus !== client_1.BookingStatus.PENDING) {
                throw new common_1.BadRequestException(`Booking is already ${booking.bookingStatus.toLowerCase()}`);
            }
            if (booking.car.status !== client_1.CarStatus.AVAILABLE) {
                throw new common_1.BadRequestException('Car is no longer available');
            }
            const updatedBooking = await tx.booking.update({
                where: { id },
                data: {
                    bookingStatus: client_1.BookingStatus.CONFIRMED,
                    paymentStatus: client_1.PaymentStatus.PAID,
                },
            });
            const updatedCar = await tx.car.update({
                where: { id: booking.carId },
                data: { status: client_1.CarStatus.BOOKED },
            });
            await tx.booking.updateMany({
                where: {
                    carId: booking.carId,
                    id: { not: id },
                    bookingStatus: client_1.BookingStatus.PENDING,
                },
                data: {
                    bookingStatus: client_1.BookingStatus.CANCELLED,
                    paymentStatus: client_1.PaymentStatus.FAILED,
                },
            });
            return { booking: updatedBooking, car: updatedCar };
        });
        if (result && result.booking) {
            this.onBookingConfirmedCallback(result.booking, result.car);
        }
        return result.booking;
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map