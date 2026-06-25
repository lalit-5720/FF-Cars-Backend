import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FindBookingsQueryDto } from './dto/find-bookings-query.dto';
export declare class BookingsController {
    private readonly bookingsService;
    constructor(bookingsService: BookingsService);
    create(req: any, createBookingDto: CreateBookingDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        bookingStatus: import("@prisma/client").$Enums.BookingStatus;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        bookingAmount: number;
        carId: string;
        userId: string;
    }>;
    findAll(req: any, query: FindBookingsQueryDto): Promise<any[]>;
    findOne(req: any, id: string): Promise<any>;
    cancel(req: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        bookingStatus: import("@prisma/client").$Enums.BookingStatus;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        bookingAmount: number;
        carId: string;
        userId: string;
    }>;
    confirm(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        bookingStatus: import("@prisma/client").$Enums.BookingStatus;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        bookingAmount: number;
        carId: string;
        userId: string;
    }>;
}
