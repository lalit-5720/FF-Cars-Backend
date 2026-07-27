import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { city?: string; search?: string }) {
    const where: Prisma.customersWhereInput = {};

    if (query?.city) {
      where.city = { equals: query.city, mode: 'insensitive' };
    }

    if (query?.search) {
      where.OR = [
        { first_name: { contains: query.search, mode: 'insensitive' } },
        { last_name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.customers.findMany({
      where,
      include: {
        _count: {
          select: {
            leads: true,
            test_drives: true,
            sales: true,
          },
        },
      },
      orderBy: { customer_id: 'desc' },
    });
  }

  async findOne(id: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { customer_id: id },
      include: {
        leads: { include: { vehicles: true, employees: true } },
        test_drives: { include: { vehicles: true, employees: true } },
        sales: { include: { vehicles: true, branches: true, payments: true, deliveries: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async create(data: Prisma.customersCreateInput) {
    return this.prisma.customers.create({ data });
  }

  async update(id: number, data: Prisma.customersUpdateInput) {
    await this.findOne(id);
    return this.prisma.customers.update({
      where: { customer_id: id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.customers.delete({
      where: { customer_id: id },
    });
  }
}
