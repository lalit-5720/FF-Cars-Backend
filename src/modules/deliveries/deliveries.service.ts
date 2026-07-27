import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DeliveriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { saleId?: number; deliveryStatus?: string; deliveredBy?: number }) {
    const where: Prisma.deliveriesWhereInput = {};

    if (query?.saleId) where.sale_id = Number(query.saleId);
    if (query?.deliveryStatus) where.delivery_status = query.deliveryStatus;
    if (query?.deliveredBy) where.delivered_by = Number(query.deliveredBy);

    return this.prisma.deliveries.findMany({
      where,
      include: {
        sales: {
          include: {
            customers: true,
            vehicles: true,
          },
        },
        employees: true,
      },
      orderBy: { delivery_id: 'desc' },
    });
  }

  async findOne(id: number) {
    const delivery = await this.prisma.deliveries.findUnique({
      where: { delivery_id: id },
      include: {
        sales: {
          include: {
            customers: true,
            vehicles: true,
            branches: true,
          },
        },
        employees: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery record with ID ${id} not found`);
    }

    return delivery;
  }

  async create(data: Prisma.deliveriesCreateInput) {
    return this.prisma.deliveries.create({
      data,
      include: {
        sales: true,
        employees: true,
      },
    });
  }

  async update(id: number, data: Prisma.deliveriesUpdateInput) {
    await this.findOne(id);
    return this.prisma.deliveries.update({
      where: { delivery_id: id },
      data,
      include: {
        sales: true,
        employees: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.deliveries.delete({
      where: { delivery_id: id },
    });
  }
}
