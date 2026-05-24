import { AdminService } from './admin.service';
import { Role } from '@prisma/client';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getAnalytics(): Promise<{
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
                id: string;
                email: string;
                name: string;
            };
            car: {
                brand: string;
                model: string;
                year: number;
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
        id: string;
        email: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }[]>;
    updateUserRole(id: string, role: Role, req: any): Promise<{
        id: string;
        email: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
}
