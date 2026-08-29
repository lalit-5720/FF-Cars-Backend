import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TestDrivesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { status?: string; customerId?: number; vehicleId?: number; branchId?: number; email?: string }) {
    const where: Prisma.test_drivesWhereInput = {};

    if (query?.status) where.status = query.status;
    if (query?.customerId) where.customer_id = Number(query.customerId);
    if (query?.vehicleId) where.vehicle_id = Number(query.vehicleId);
    if (query?.branchId) {
      where.vehicles = { branch_id: Number(query.branchId) };
    }
    if (query?.email) {
      where.customers = {
        email: {
          equals: query.email.trim(),
          mode: 'insensitive',
        },
      };
    }

    const list = await this.prisma.test_drives.findMany({
      where,
      include: {
        customers: true,
        vehicles: true,
        employees: true,
      },
      orderBy: { test_drive_id: 'desc' },
    });

    const allSales = await this.prisma.sales.findMany({
      select: { customer_id: true, vehicle_id: true, payment_status: true, delivery_status: true },
    });

    return list.map((td) => {
      const matchSale = allSales.find(
        (s) => s.customer_id === td.customer_id && s.vehicle_id === td.vehicle_id
      );
      const isPurchased = Boolean(matchSale);
      const saleStatus = matchSale ? (matchSale.payment_status || 'Completed') : 'Not Purchased';
      const testDriveStatus = td.status || 'Scheduled';

      return {
        ...td,
        test_drive_status: testDriveStatus,
        sale_status: saleStatus,
        is_purchased: isPurchased,
      };
    });
  }

  async findOne(id: number) {
    const testDrive = await this.prisma.test_drives.findUnique({
      where: { test_drive_id: id },
      include: {
        customers: true,
        vehicles: true,
        employees: true,
      },
    });

    if (!testDrive) {
      throw new NotFoundException(`Test Drive with ID ${id} not found`);
    }

    return testDrive;
  }

  async create(data: any) {
    let customerId = Number(data.customer_id || data.customerId || 0);
    let vehicleId = Number(data.vehicle_id || data.vehicleId || 0);
    let employeeId = Number(data.employee_id || data.employeeId || 1);

    // If customerId is missing but guest details are provided, find or create customer
    if (!customerId && (data.email || data.phone || data.name || data.firstName)) {
      const email = data.email || `guest_${Date.now()}@carrevive.in`;
      const phone = data.phone || '9876543210';
      const firstName = data.firstName || data.name || 'Guest';
      const lastName = data.lastName || 'User';

      let cust = await this.prisma.customers.findFirst({
        where: { OR: [{ email }, { phone }] },
      });

      if (!cust) {
        cust = await this.prisma.customers.create({
          data: {
            first_name: firstName,
            last_name: lastName,
            email,
            phone,
          },
        });
      }
      customerId = cust.customer_id;
    }

    if (!customerId) customerId = 1;
    if (!vehicleId) vehicleId = 1;

    // PostgreSQL check constraint test_drives_status_check allows: "Scheduled", "Completed", "Cancelled", "Approved"
    const rawStatus = data.status || 'Scheduled';
    const validStatus = (rawStatus === 'Pending' || rawStatus === 'PENDING') ? 'Scheduled' : rawStatus;

    const createData: Prisma.test_drivesUncheckedCreateInput = {
      customer_id: customerId,
      vehicle_id: vehicleId,
      employee_id: employeeId,
      test_drive_date: data.test_drive_date || data.scheduled_date || data.scheduledDate ? new Date(data.test_drive_date || data.scheduled_date || data.scheduledDate) : new Date(),
      status: validStatus,
      feedback: data.feedback || data.notes || data.comments || '',
    };

    let testDriveRes;
    try {
      testDriveRes = await this.prisma.test_drives.create({
        data: createData,
        include: {
          customers: true,
          vehicles: true,
          employees: true,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Auto-heal PostgreSQL sequence and retry
        await this.prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('public.test_drives', 'test_drive_id'), COALESCE((SELECT MAX(test_drive_id) FROM public.test_drives), 1));`
        );
        testDriveRes = await this.prisma.test_drives.create({
          data: createData,
          include: {
            customers: true,
            vehicles: true,
            employees: true,
          },
        });
      } else {
        throw err;
      }
    }

    // Auto-create lead in PostgreSQL leads table when a test drive interest is registered
    try {
      await this.prisma.leads.create({
        data: {
          customer_id: customerId,
          vehicle_id: vehicleId,
          employee_id: employeeId,
          source: 'Website Test Drive',
          interest_level: 'Hot Lead 🔥',
          status: 'In Progress',
          remarks: `Auto-generated lead from Test Drive booking #${testDriveRes.test_drive_id}`,
        },
      });
    } catch (err) {
      // Ignore if lead already exists
    }

    return testDriveRes;
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    
    let customerId = data.customer_id || data.customerId ? Number(data.customer_id || data.customerId) : undefined;
    let vehicleId = data.vehicle_id || data.vehicleId ? Number(data.vehicle_id || data.vehicleId) : undefined;
    let employeeId = data.employee_id || data.employeeId ? Number(data.employee_id || data.employeeId) : undefined;

    const rawStatus = data.status;
    const validStatus = (rawStatus === 'Pending' || rawStatus === 'PENDING') ? 'Scheduled' : rawStatus;

    const updateData: Prisma.test_drivesUncheckedUpdateInput = {
      ...(customerId ? { customer_id: customerId } : {}),
      ...(vehicleId ? { vehicle_id: vehicleId } : {}),
      ...(employeeId ? { employee_id: employeeId } : {}),
      ...(validStatus ? { status: validStatus } : {}),
      ...(data.feedback || data.notes || data.comments ? { feedback: data.feedback || data.notes || data.comments } : {}),
      ...(data.test_drive_date || data.scheduled_date || data.scheduledDate ? { test_drive_date: new Date(data.test_drive_date || data.scheduled_date || data.scheduledDate) } : {}),
    };

    return this.prisma.test_drives.update({
      where: { test_drive_id: id },
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
    return this.prisma.test_drives.delete({
      where: { test_drive_id: id },
    });
  }
}
