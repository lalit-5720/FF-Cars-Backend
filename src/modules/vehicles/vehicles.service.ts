import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: {
    make?: string;
    model?: string;
    fuelType?: string;
    transmission?: string;
    status?: string;
    branchId?: number;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
  }) {
    const where: Prisma.vehiclesWhereInput = {};

    if (query?.make) where.make = { equals: query.make, mode: 'insensitive' };
    if (query?.model) where.model = { contains: query.model, mode: 'insensitive' };
    if (query?.fuelType) where.fuel_type = { equals: query.fuelType, mode: 'insensitive' };
    if (query?.transmission) where.transmission = { equals: query.transmission, mode: 'insensitive' };
    if (query?.status) where.status = query.status;
    if (query?.branchId) where.branch_id = Number(query.branchId);

    if (query?.minPrice || query?.maxPrice) {
      where.price = {};
      if (query.minPrice) where.price.gte = Number(query.minPrice);
      if (query.maxPrice) where.price.lte = Number(query.maxPrice);
    }

    if (query?.search) {
      where.OR = [
        { make: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
        { registration_number: { contains: query.search, mode: 'insensitive' } },
        { color: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.vehicles.findMany({
      where,
      include: {
        branches: true,
      },
      orderBy: { vehicle_id: 'desc' },
    });
  }

  async findOne(id: number) {
    const vehicle = await this.prisma.vehicles.findUnique({
      where: { vehicle_id: id },
      include: {
        branches: true,
        leads: {
          take: 5,
          include: { customers: true },
        },
        test_drives: {
          take: 5,
          include: { customers: true },
        },
        sales: {
          include: { customers: true, employees: true },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    return vehicle;
  }

  async create(data: Prisma.vehiclesCreateInput) {
    return this.prisma.vehicles.create({ data });
  }

  async update(id: number, data: Prisma.vehiclesUpdateInput) {
    await this.findOne(id);
    return this.prisma.vehicles.update({
      where: { vehicle_id: id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.vehicles.delete({
      where: { vehicle_id: id },
    });
  }

  async getStats() {
    const totalVehicles = await this.prisma.vehicles.count();
    const availableVehicles = await this.prisma.vehicles.count({ where: { status: 'Available' } });
    const reservedVehicles = await this.prisma.vehicles.count({ where: { status: 'Reserved' } });
    const soldVehicles = await this.prisma.vehicles.count({ where: { status: 'Sold' } });

    return {
      totalVehicles,
      availableVehicles,
      reservedVehicles,
      soldVehicles,
    };
  }
}
