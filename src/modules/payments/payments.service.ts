import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { saleId?: number; paymentMethod?: string; paymentStatus?: string }) {
    const where: Prisma.paymentsWhereInput = {};

    if (query?.saleId) where.sale_id = Number(query.saleId);
    if (query?.paymentMethod) where.payment_method = query.paymentMethod;
    if (query?.paymentStatus) where.payment_status = query.paymentStatus;

    return this.prisma.payments.findMany({
      where,
      include: {
        sales: {
          include: {
            customers: true,
            vehicles: true,
          },
        },
      },
      orderBy: { payment_id: 'desc' },
    });
  }

  async findOne(id: number) {
    const payment = await this.prisma.payments.findUnique({
      where: { payment_id: id },
      include: {
        sales: {
          include: {
            customers: true,
            vehicles: true,
            branches: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID ${id} not found`);
    }

    return payment;
  }

  async create(data: Prisma.paymentsCreateInput) {
    return this.prisma.payments.create({
      data,
      include: {
        sales: true,
      },
    });
  }

  async update(id: number, data: Prisma.paymentsUpdateInput) {
    await this.findOne(id);
    return this.prisma.payments.update({
      where: { payment_id: id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.payments.delete({
      where: { payment_id: id },
    });
  }
}
