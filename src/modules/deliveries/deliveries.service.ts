import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DeliveriesService {
  constructor(private prisma: PrismaService) {}

  private normalizeDeliveryStatus(status?: string) {
    const raw = String(status || 'Pending').trim();
    const value = raw.toLowerCase();

    if (['delivered', 'completed', 'done'].includes(value)) return 'Delivered';
    if (['cancelled', 'canceled', 'rejected', 'failed'].includes(value)) return 'Cancelled';
    if (['scheduled', 'pending', 'in_transit', 'ready'].includes(value)) return 'Pending';

    return 'Pending';
  }

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

  async create(data: Prisma.deliveriesCreateInput | any) {
    const saleId = Number(data.sale_id ?? data.saleId ?? 0);
    if (!saleId) {
      throw new BadRequestException('sale_id is required to create a delivery record');
    }

    const normalizedData = {
      ...data,
      sale_id: saleId,
      delivered_by: data.delivered_by ?? data.deliveredBy ?? null,
      customer_received: data.customer_received ?? data.customerReceived ?? true,
      delivery_status: this.normalizeDeliveryStatus(data.delivery_status ?? data.deliveryStatus),
      delivery_date: data.delivery_date || data.deliveryDate ? new Date(data.delivery_date || data.deliveryDate) : new Date(),
    };

    return this.prisma.deliveries.create({
      data: normalizedData,
      include: {
        sales: true,
        employees: true,
      },
    });
  }

  async update(id: number, data: Prisma.deliveriesUpdateInput | any) {
    await this.findOne(id);
    const normalizedData = {
      ...data,
      ...(data.sale_id ?? data.saleId ? { sale_id: Number(data.sale_id ?? data.saleId) } : {}),
      ...(data.delivered_by ?? data.deliveredBy ? { delivered_by: Number(data.delivered_by ?? data.deliveredBy) } : {}),
      ...(data.delivery_status || data.deliveryStatus ? { delivery_status: this.normalizeDeliveryStatus(data.delivery_status ?? data.deliveryStatus) } : {}),
      ...(data.delivery_date || data.deliveryDate ? { delivery_date: new Date(data.delivery_date || data.deliveryDate) } : {}),
      ...(data.customer_received !== undefined || data.customerReceived !== undefined ? { customer_received: Boolean(data.customer_received ?? data.customerReceived ?? true) } : {}),
    };

    return this.prisma.deliveries.update({
      where: { delivery_id: id },
      data: normalizedData,
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
