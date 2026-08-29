import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { customer_id?: number; customerId?: number; vehicle_id?: number; vehicleId?: number; rating?: number; comment: string }) {
    const customerId = Number(data.customer_id || data.customerId || 1);
    const vehicleId = Number(data.vehicle_id || data.vehicleId || 1);
    const rating = Number(data.rating || 5);

    return this.prisma.reviews.create({
      data: {
        customer_id: customerId,
        vehicle_id: vehicleId,
        rating,
        comment: data.comment,
        is_published: false,
      },
      include: {
        customers: true,
        vehicles: true,
      },
    });
  }

  async findAll() {
    return this.prisma.reviews.findMany({
      include: {
        customers: true,
        vehicles: true,
      },
      orderBy: { review_id: 'desc' },
    });
  }

  async findPublished() {
    return this.prisma.reviews.findMany({
      where: { is_published: true },
      include: {
        customers: true,
        vehicles: true,
      },
      orderBy: { review_id: 'desc' },
    });
  }

  async getApprovalSummary() {
    const reviews = await this.prisma.reviews.findMany();

    const total = reviews.length;
    const approved = reviews.filter((review) => Boolean(review.is_published)).length;
    const pending = total - approved;

    return {
      total,
      approved,
      pending,
    };
  }

  async togglePublish(id: number, is_published?: boolean) {
    const existing = await this.prisma.reviews.findUnique({ where: { review_id: id } });
    if (!existing) {
      throw new NotFoundException(`Review #${id} not found`);
    }

    const nextPublishedStatus = is_published !== undefined ? is_published : !existing.is_published;

    return this.prisma.reviews.update({
      where: { review_id: id },
      data: { is_published: nextPublishedStatus },
      include: {
        customers: true,
        vehicles: true,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.reviews.delete({
      where: { review_id: id },
    });
  }
}
