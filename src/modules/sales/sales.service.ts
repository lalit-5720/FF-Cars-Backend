import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  private normalizePaymentStatus(paymentStatus?: string, depositAmount?: number, loanAmount?: number) {
    const raw = String(paymentStatus || '').trim();
    const deposit = Number(depositAmount || 0);
    const loan = Number(loanAmount || 0);

    if (!raw) {
      if (deposit > 0 || loan > 0) return 'Pending';
      return 'Paid';
    }

    const normalized = raw.toLowerCase();
    if (normalized.includes('paid') || normalized.includes('completed')) return 'Paid';
    if (normalized.includes('deposit') || normalized.includes('loan') || normalized.includes('pending') || normalized.includes('sanction')) return 'Pending';

    if (deposit > 0 || loan > 0) return 'Pending';
    return 'Paid';
  }

  async findAll(query?: {
    branchId?: number;
    paymentStatus?: string;
    deliveryStatus?: string;
    employeeId?: number;
    customerId?: number;
  }) {
    const where: Prisma.salesWhereInput = {};

    if (query?.branchId) where.branch_id = Number(query.branchId);
    if (query?.paymentStatus) where.payment_status = query.paymentStatus;
    if (query?.deliveryStatus) where.delivery_status = query.deliveryStatus;
    if (query?.employeeId) where.employee_id = Number(query.employeeId);
    if (query?.customerId) where.customer_id = Number(query.customerId);

    return this.prisma.sales.findMany({
      where,
      include: {
        customers: true,
        vehicles: true,
        employees: true,
        branches: true,
        payments: true,
        deliveries: true,
      },
      orderBy: { sale_id: 'desc' },
    });
  }

  async findOne(id: number) {
    const sale = await this.prisma.sales.findUnique({
      where: { sale_id: id },
      include: {
        customers: true,
        vehicles: true,
        employees: true,
        branches: true,
        payments: true,
        deliveries: { include: { employees: true } },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale transaction with ID ${id} not found`);
    }

    return sale;
  }

  async create(data: any) {
    let customerId = Number(data.customer_id || data.customerId || 1);
    let vehicleId = Number(data.vehicle_id || data.vehicleId || 1);
    let employeeId = Number(data.employee_id || data.employeeId || 1);
    let branchId = Number(data.branch_id || data.branchId || 1);

    const price = Number(data.final_amount || data.finalAmount || data.selling_price || data.sellingPrice || data.price || 500000);
    const rawDeliveryStatus = data.delivery_status || data.deliveryStatus || 'Pending';
    const validDeliveryStatus = (rawDeliveryStatus === 'Scheduled' || rawDeliveryStatus === 'SCHEDULED') ? 'Pending' : rawDeliveryStatus;

    const depositAmount = Number(data.deposit_amount ?? data.depositAmount ?? (data.loan_amount || data.loanAmount ? (data.downpayment ?? 0) : price));
    const loanAmount = Number(data.loan_amount ?? data.loanAmount ?? 0);
    const validPaymentStatus = this.normalizePaymentStatus(data.payment_status || data.paymentStatus, depositAmount, loanAmount);

    const createData: Prisma.salesUncheckedCreateInput = {
      customer_id: customerId,
      vehicle_id: vehicleId,
      branch_id: branchId,
      employee_id: employeeId,
      selling_price: String(data.selling_price || data.sellingPrice || price),
      final_amount: String(price),
      deposit_amount: String(depositAmount),
      loan_amount: String(loanAmount),
      discount: String(data.discount || 0),
      tax: String(data.tax || 0),
      payment_status: validPaymentStatus,
      delivery_status: validDeliveryStatus,
      sale_date: data.sale_date || data.saleDate ? new Date(data.sale_date || data.saleDate) : new Date(),
    };

    try {
      return await this.prisma.sales.create({
        data: createData,
        include: {
          customers: true,
          vehicles: true,
          employees: true,
          branches: true,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        await this.prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('public.sales', 'sale_id'), COALESCE((SELECT MAX(sale_id) FROM public.sales), 1));`
        );
        return await this.prisma.sales.create({
          data: createData,
          include: {
            customers: true,
            vehicles: true,
            employees: true,
            branches: true,
          },
        });
      }
      throw err;
    }
  }

  async update(id: number, data: any) {
    await this.findOne(id);

    let customerId = data.customer_id || data.customerId ? Number(data.customer_id || data.customerId) : undefined;
    let vehicleId = data.vehicle_id || data.vehicleId ? Number(data.vehicle_id || data.vehicleId) : undefined;
    let employeeId = data.employee_id || data.employeeId ? Number(data.employee_id || data.employeeId) : undefined;
    let branchId = data.branch_id || data.branchId ? Number(data.branch_id || data.branchId) : undefined;

    const rawDeliveryStatus = data.delivery_status || data.deliveryStatus;
    const validDeliveryStatus = (rawDeliveryStatus === 'Scheduled' || rawDeliveryStatus === 'SCHEDULED') ? 'Pending' : rawDeliveryStatus;

    const sellingPrice = data.selling_price !== undefined || data.sellingPrice !== undefined ? Number(data.selling_price ?? data.sellingPrice) : undefined;
    const finalAmount = data.final_amount !== undefined || data.finalAmount !== undefined ? Number(data.final_amount ?? data.finalAmount) : undefined;
    const discount = data.discount !== undefined ? Number(data.discount) : undefined;
    const tax = data.tax !== undefined ? Number(data.tax) : undefined;

    const depositAmount = data.deposit_amount !== undefined || data.depositAmount !== undefined ? Number(data.deposit_amount ?? data.depositAmount ?? 0) : undefined;
    const loanAmount = data.loan_amount !== undefined || data.loanAmount !== undefined ? Number(data.loan_amount ?? data.loanAmount ?? 0) : undefined;
    const hasPaymentStatus = data.payment_status !== undefined || data.paymentStatus !== undefined;
    const validPaymentStatus = hasPaymentStatus
      ? this.normalizePaymentStatus(data.payment_status || data.paymentStatus, depositAmount ?? 0, loanAmount ?? 0)
      : undefined;

    const updateData: Prisma.salesUncheckedUpdateInput = {
      ...(customerId ? { customer_id: customerId } : {}),
      ...(vehicleId ? { vehicle_id: vehicleId } : {}),
      ...(employeeId ? { employee_id: employeeId } : {}),
      ...(branchId ? { branch_id: branchId } : {}),
      ...(depositAmount !== undefined ? { deposit_amount: String(depositAmount) } : {}),
      ...(loanAmount !== undefined ? { loan_amount: String(loanAmount) } : {}),
      ...(sellingPrice !== undefined && Number.isFinite(sellingPrice) ? { selling_price: String(sellingPrice) } : {}),
      ...(finalAmount !== undefined && Number.isFinite(finalAmount) ? { final_amount: String(finalAmount) } : {}),
      ...(discount !== undefined && Number.isFinite(discount) ? { discount: String(discount) } : {}),
      ...(tax !== undefined && Number.isFinite(tax) ? { tax: String(tax) } : {}),
      ...(validPaymentStatus ? { payment_status: validPaymentStatus } : {}),
      ...(validDeliveryStatus ? { delivery_status: validDeliveryStatus } : {}),
    };

    return this.prisma.sales.update({
      where: { sale_id: id },
      data: updateData,
      include: {
        customers: true,
        vehicles: true,
        employees: true,
        branches: true,
        payments: true,
        deliveries: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.sales.delete({
      where: { sale_id: id },
    });
  }

  async getRevenueStats() {
    const totalSales = await this.prisma.sales.count();
    const aggregate = await this.prisma.sales.aggregate({
      _sum: {
        final_amount: true,
        selling_price: true,
        discount: true,
      },
    });

    return {
      totalSalesCount: totalSales,
      totalRevenue: Number(aggregate._sum?.final_amount || aggregate._sum?.selling_price || 0),
      totalDiscountGiven: Number(aggregate._sum?.discount || 0),
    };
  }
}
