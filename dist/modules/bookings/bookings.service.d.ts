import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Car, Booking, Role } from '@prisma/client';
export declare class BookingsService {
    private prisma;
    constructor(prisma: PrismaService);
    private onBookingCreatedCallback;
    private onBookingCancelledCallback;
    private onBookingConfirmedCallback;
    registerCallbacks(onCreated: (b: any, c: Car) => void, onCancelled: (b: any, c: Car) => void, onConfirmed: (b: any, c: Car) => void): void;
    createBooking(userId: string, createBookingDto: CreateBookingDto): Promise<Booking>;
    findAll(userId: string, role: Role, allBookings?: boolean): Promise<any[]>;
    findOne(id: string, userId: string, role: Role): Promise<any>;
    cancelBooking(id: string, userId: string, role: Role): Promise<Booking>;
    confirmBooking(id: string): Promise<Booking>;
}
