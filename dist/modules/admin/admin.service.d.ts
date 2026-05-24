import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardAnalytics(): Promise<{
        users: {
            customers: number;
            admins: number;
            total: number;
        };
        cars: {
            total: number;
            available: number | true | {
                id?: number | undefined;
                brand?: number | undefined;
                model?: number | undefined;
                variant?: number | undefined;
                year?: number | undefined;
                fuelType?: number | undefined;
                transmission?: number | undefined;
                kmDriven?: number | undefined;
                ownership?: number | undefined;
                price?: number | undefined;
                description?: number | undefined;
                status?: number | undefined;
                thumbnail?: number | undefined;
                images?: number | undefined;
                createdAt?: number | undefined;
                updatedAt?: number | undefined;
                _all?: number | undefined;
            };
            booked: number | true | {
                id?: number | undefined;
                brand?: number | undefined;
                model?: number | undefined;
                variant?: number | undefined;
                year?: number | undefined;
                fuelType?: number | undefined;
                transmission?: number | undefined;
                kmDriven?: number | undefined;
                ownership?: number | undefined;
                price?: number | undefined;
                description?: number | undefined;
                status?: number | undefined;
                thumbnail?: number | undefined;
                images?: number | undefined;
                createdAt?: number | undefined;
                updatedAt?: number | undefined;
                _all?: number | undefined;
            };
            maintenance: number | true | {
                id?: number | undefined;
                brand?: number | undefined;
                model?: number | undefined;
                variant?: number | undefined;
                year?: number | undefined;
                fuelType?: number | undefined;
                transmission?: number | undefined;
                kmDriven?: number | undefined;
                ownership?: number | undefined;
                price?: number | undefined;
                description?: number | undefined;
                status?: number | undefined;
                thumbnail?: number | undefined;
                images?: number | undefined;
                createdAt?: number | undefined;
                updatedAt?: number | undefined;
                _all?: number | undefined;
            };
        };
        bookings: {
            total: number;
            pending: number | true | {
                id?: number | undefined;
                userId?: number | undefined;
                carId?: number | undefined;
                bookingStatus?: number | undefined;
                paymentStatus?: number | undefined;
                bookingAmount?: number | undefined;
                createdAt?: number | undefined;
                updatedAt?: number | undefined;
                _all?: number | undefined;
            };
            confirmed: number | true | {
                id?: number | undefined;
                userId?: number | undefined;
                carId?: number | undefined;
                bookingStatus?: number | undefined;
                paymentStatus?: number | undefined;
                bookingAmount?: number | undefined;
                createdAt?: number | undefined;
                updatedAt?: number | undefined;
                _all?: number | undefined;
            };
            cancelled: number | true | {
                id?: number | undefined;
                userId?: number | undefined;
                carId?: number | undefined;
                bookingStatus?: number | undefined;
                paymentStatus?: number | undefined;
                bookingAmount?: number | undefined;
                createdAt?: number | undefined;
                updatedAt?: number | undefined;
                _all?: number | undefined;
            };
        };
        revenue: number;
        recentBookings: ({
            user: {
                name: string;
                id: string;
                email: string;
            };
            car: {
                year: number;
                brand: string;
                model: string;
                price: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            bookingStatus: import("@prisma/client").$Enums.BookingStatus;
            paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
            bookingAmount: number;
            carId: string;
            userId: string;
        })[];
    }>;
    getAllUsers(): Promise<{
        name: string;
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }[]>;
    updateUserRole(targetUserId: string, actorUserId: string, role: Role): Promise<{
        name: string;
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
}
