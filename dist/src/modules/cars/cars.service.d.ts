import { PrismaService } from '../../prisma/prisma.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { GetCarsFilterDto } from './dto/get-cars-filter.dto';
import { Car, Prisma } from '@prisma/client';
export declare class CarsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createCarDto: CreateCarDto): Promise<Car>;
    findAll(filterDto: GetCarsFilterDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            brand: string;
            model: string;
            variant: string;
            year: number;
            fuelType: string;
            transmission: string;
            kmDriven: number;
            ownership: string;
            price: number;
            description: string;
            status: import("@prisma/client").$Enums.CarStatus;
            thumbnail: string;
            images: Prisma.JsonValue;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<Car>;
    update(id: string, updateCarDto: UpdateCarDto): Promise<Car>;
    remove(id: string): Promise<Car>;
    getUniqueBrands(): Promise<string[]>;
}
