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
exports.CarsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CarsService = class CarsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createCarDto) {
        return this.prisma.car.create({
            data: createCarDto,
        });
    }
    async findAll(filterDto) {
        const { search, brand, minPrice, maxPrice, fuelType, transmission, minYear, maxYear, page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc', } = filterDto;
        const where = {};
        if (search) {
            where.OR = [
                { brand: { contains: search } },
                { model: { contains: search } },
                { variant: { contains: search } },
            ];
        }
        if (brand) {
            where.brand = { equals: brand };
        }
        if (fuelType) {
            where.fuelType = { equals: fuelType };
        }
        if (transmission) {
            where.transmission = { equals: transmission };
        }
        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) {
                where.price.gte = parseFloat(minPrice);
            }
            if (maxPrice) {
                where.price.lte = parseFloat(maxPrice);
            }
        }
        if (minYear || maxYear) {
            where.year = {};
            if (minYear) {
                where.year.gte = parseInt(minYear, 10);
            }
            if (maxYear) {
                where.year.lte = parseInt(maxYear, 10);
            }
        }
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const skip = (pageNum - 1) * limitNum;
        const orderBy = {};
        if (sortBy) {
            orderBy[sortBy] = sortOrder || 'desc';
        }
        const [total, data] = await this.prisma.$transaction([
            this.prisma.car.count({ where }),
            this.prisma.car.findMany({
                where,
                skip,
                take: limitNum,
                orderBy,
            }),
        ]);
        return {
            data,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        };
    }
    async findOne(id) {
        const car = await this.prisma.car.findUnique({
            where: { id },
        });
        if (!car) {
            throw new common_1.NotFoundException(`Car with ID ${id} not found`);
        }
        return car;
    }
    async update(id, updateCarDto) {
        await this.findOne(id);
        return this.prisma.car.update({
            where: { id },
            data: updateCarDto,
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.car.delete({
            where: { id },
        });
    }
    async getUniqueBrands() {
        const cars = await this.prisma.car.findMany({
            select: { brand: true },
            distinct: ['brand'],
        });
        return cars.map((c) => c.brand).sort();
    }
};
exports.CarsService = CarsService;
exports.CarsService = CarsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CarsService);
//# sourceMappingURL=cars.service.js.map