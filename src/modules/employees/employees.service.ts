import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { branchId?: number; role?: string; search?: string }) {
    const where: Prisma.employeesWhereInput = {};

    if (query?.branchId) where.branch_id = Number(query.branchId);
    if (query?.role) where.role = { equals: query.role, mode: 'insensitive' };

    if (query?.search) {
      where.OR = [
        { first_name: { contains: query.search, mode: 'insensitive' } },
        { last_name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.employees.findMany({
      where,
      include: {
        branches: true,
        _count: {
          select: {
            sales: true,
            leads: true,
            test_drives: true,
          },
        },
      },
      orderBy: { employee_id: 'asc' },
    });
  }

  async findOne(id: number) {
    const employee = await this.prisma.employees.findUnique({
      where: { employee_id: id },
      include: {
        branches: true,
        sales: { include: { vehicles: true, customers: true } },
        leads: { include: { vehicles: true, customers: true } },
        test_drives: { include: { vehicles: true, customers: true } },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async create(data: Prisma.employeesCreateInput) {
    return this.prisma.employees.create({ data });
  }

  async update(id: number, data: Prisma.employeesUpdateInput) {
    await this.findOne(id);
    return this.prisma.employees.update({
      where: { employee_id: id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.employees.delete({
      where: { employee_id: id },
    });
  }
}
