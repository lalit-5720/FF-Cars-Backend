import { CarStatus } from '@prisma/client';
export declare class UpdateCarDto {
    brand?: string;
    model?: string;
    variant?: string;
    year?: number;
    fuelType?: string;
    transmission?: string;
    kmDriven?: number;
    ownership?: string;
    price?: number;
    description?: string;
    status?: CarStatus;
    thumbnail?: string;
    images?: string[];
}
