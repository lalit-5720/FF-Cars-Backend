import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

  async create(data: any) {
    const rawPassword = data.password || 'password123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    return this.prisma.employees.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    const updateData: any = { ...data };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    return this.prisma.employees.update({
      where: { employee_id: id },
      data: updateData,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.employees.delete({
      where: { employee_id: id },
    });
  }
}
