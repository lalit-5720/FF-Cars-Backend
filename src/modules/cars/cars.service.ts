import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { GetCarsFilterDto } from './dto/get-cars-filter.dto';
import { Car, Prisma } from '@prisma/client';

@Injectable()
export class CarsService {
  constructor(private prisma: PrismaService) {}

  async create(createCarDto: CreateCarDto): Promise<Car> {
    return this.prisma.car.create({
      data: createCarDto,
    });
  }

  async findAll(filterDto: GetCarsFilterDto) {
    const {
      search,
      brand,
      minPrice,
      maxPrice,
      fuelType,
      transmission,
      minYear,
      maxYear,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const where: Prisma.CarWhereInput = {};

    // Search query (brand or model)
    if (search) {
      where.OR = [
        { brand: { contains: search } },
        { model: { contains: search } },
        { variant: { contains: search } },
      ];
    }

    // Filters
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

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const orderBy: Prisma.CarOrderByWithRelationInput = {};
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

  async findOne(id: string): Promise<Car> {
    const car = await this.prisma.car.findUnique({
      where: { id },
    });
    if (!car) {
      throw new NotFoundException(`Car with ID ${id} not found`);
    }
    return car;
  }

  async update(id: string, updateCarDto: UpdateCarDto): Promise<Car> {
    await this.findOne(id); // Throws if not exists
    return this.prisma.car.update({
      where: { id },
      data: updateCarDto,
    });
  }

  async remove(id: string): Promise<Car> {
    await this.findOne(id); // Throws if not exists
    return this.prisma.car.delete({
      where: { id },
    });
  }

  // Get list of unique brands for frontend filters
  async getUniqueBrands(): Promise<string[]> {
    const cars = await this.prisma.car.findMany({
      select: { brand: true },
      distinct: ['brand'],
    });
    return cars.map((c) => c.brand).sort();
  }
}
