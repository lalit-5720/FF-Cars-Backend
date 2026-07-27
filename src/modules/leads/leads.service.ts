import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { status?: string; interestLevel?: string; source?: string }) {
    const where: Prisma.leadsWhereInput = {};

    if (query?.status) where.status = query.status;
    if (query?.interestLevel) where.interest_level = query.interestLevel;
    if (query?.source) where.source = query.source;

    return this.prisma.leads.findMany({
      where,
      include: {
        customers: true,
        vehicles: true,
        employees: true,
      },
      orderBy: { lead_id: 'desc' },
    });
  }

  async findOne(id: number) {
    const lead = await this.prisma.leads.findUnique({
      where: { lead_id: id },
      include: {
        customers: true,
        vehicles: true,
        employees: true,
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return lead;
  }

  async create(data: any) {
    const { customer_id, vehicle_id, employee_id, customers, vehicles, employees, ...rest } = data;

    const createData: Prisma.leadsUncheckedCreateInput = {
      ...rest,
      ...(customer_id ? { customer_id: Number(customer_id) } : {}),
      ...(vehicle_id ? { vehicle_id: Number(vehicle_id) } : {}),
      ...(employee_id ? { employee_id: Number(employee_id) } : {}),
    };

    return this.prisma.leads.create({
      data: createData,
      include: {
        customers: true,
        vehicles: true,
        employees: true,
      },
    });
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    const { customer_id, vehicle_id, employee_id, customers, vehicles, employees, ...rest } = data;

    const updateData: Prisma.leadsUncheckedUpdateInput = {
      ...rest,
      ...(customer_id ? { customer_id: Number(customer_id) } : {}),
      ...(vehicle_id ? { vehicle_id: Number(vehicle_id) } : {}),
      ...(employee_id ? { employee_id: Number(employee_id) } : {}),
    };

    return this.prisma.leads.update({
      where: { lead_id: id },
      data: updateData,
      include: {
        customers: true,
        vehicles: true,
        employees: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.leads.delete({
      where: { lead_id: id },
    });
  }
}
