import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.branches.findMany({
      include: {
        _count: {
          select: {
            employees: true,
            vehicles: true,
            sales: true,
          },
        },
      },
      orderBy: { branch_id: 'asc' },
    });
  }

  async findOne(id: number) {
    const branch = await this.prisma.branches.findUnique({
      where: { branch_id: id },
      include: {
        employees: true,
        vehicles: true,
        sales: {
          take: 10,
          orderBy: { sale_date: 'desc' },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    return branch;
  }

  async create(data: Prisma.branchesCreateInput) {
    return this.prisma.branches.create({ data });
  }

  async update(id: number, data: Prisma.branchesUpdateInput) {
    await this.findOne(id);
    return this.prisma.branches.update({
      where: { branch_id: id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.branches.delete({
      where: { branch_id: id },
    });
  }
}
