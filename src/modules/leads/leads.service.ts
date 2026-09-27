import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: {
    status?: string;
    interestLevel?: string;
    source?: string;
    employeeId?: number;
    branchId?: number;
  }) {
    const where: Prisma.leadsWhereInput = {};

    if (query?.status) where.status = query.status;
    if (query?.interestLevel) where.interest_level = query.interestLevel;
    if (query?.source) where.source = query.source;
    if (query?.employeeId) where.employee_id = Number(query.employeeId);
    if (query?.branchId) {
      where.OR = [
        { employees: { branch_id: Number(query.branchId) } },
        { vehicles: { branch_id: Number(query.branchId) } },
      ];
    }

    return this.prisma.leads.findMany({
      where,
      include: {
        customers: true,
        vehicles: {
          include: {
            branches: true,
          },
        },
        employees: {
          include: {
            branches: true,
          },
        },
      },
      orderBy: { lead_id: 'desc' },
    });
  }

  async getEmployeeLeadStats(employeeId: number) {
    const empId = Number(employeeId);

    // 1. Leads assigned to this employee
    const assignedLeads = await this.prisma.leads.findMany({
      where: { employee_id: empId },
    });

    const totalLeads = assignedLeads.length;
    const convertedLeads = assignedLeads.filter((l) => {
      const s = (l.status || '').toLowerCase();
      return s.includes('converted') || s.includes('won') || s.includes('purchased') || s.includes('closed');
    }).length;

    const activeLeads = assignedLeads.filter((l) => {
      const s = (l.status || '').toLowerCase();
      return !s.includes('converted') && !s.includes('won') && !s.includes('purchased') && !s.includes('lost') && !s.includes('dropped');
    }).length;

    const lostLeads = assignedLeads.filter((l) => {
      const s = (l.status || '').toLowerCase();
      return s.includes('lost') || s.includes('dropped') || s.includes('cancelled');
    }).length;

    const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;

    // 2. Successful purchases / closed sales made by this employee
    const sales = await this.prisma.sales.findMany({
      where: { employee_id: empId },
      include: {
        vehicles: true,
        customers: true,
      },
    });

    const successfulPurchases = sales.length;
    let totalRevenueClosed = 0;
    for (const s of sales) {
      totalRevenueClosed += Number(s.final_amount ?? s.selling_price ?? 0);
    }

    return {
      employeeId: empId,
      totalLeads,
      convertedLeads,
      activeLeads,
      lostLeads,
      conversionRate,
      successfulPurchases,
      totalRevenueClosed,
    };
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
