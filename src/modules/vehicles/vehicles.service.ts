import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../common/gateways/events.gateway';
import { Prisma } from '@prisma/client';

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  private normalizeVehicleData(data: Prisma.vehiclesUpdateInput | Prisma.vehiclesCreateInput) {
    if (!data || typeof data !== 'object') return data;

    const normalized = { ...data } as Record<string, any>;

    for (const field of ['insurance_valid_till', 'purchase_date']) {
      const value = normalized[field];
      if (typeof value === 'string' && value.trim() !== '') {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          normalized[field] = date;
        } else {
          delete normalized[field];
        }
      } else if (value === '' || value === null) {
        normalized[field] = null;
      }
    }

    if (normalized.branch_id !== undefined && normalized.branch_id !== null) {
      normalized.branch_id = Number(normalized.branch_id);
    }
    if (normalized.manufacture_year !== undefined && normalized.manufacture_year !== null && normalized.manufacture_year !== '') {
      normalized.manufacture_year = Number(normalized.manufacture_year);
    }
    if (normalized.kilometers_driven !== undefined && normalized.kilometers_driven !== null && normalized.kilometers_driven !== '') {
      normalized.kilometers_driven = Number(normalized.kilometers_driven);
    }
    if (normalized.price !== undefined && normalized.price !== null && normalized.price !== '') {
      normalized.price = Number(normalized.price);
    }
    if (normalized.purchase_price !== undefined && normalized.purchase_price !== null && normalized.purchase_price !== '') {
      normalized.purchase_price = Number(normalized.purchase_price);
    }

    return normalized;
  }

  private extractInspectionReport(description?: string | null) {
    if (!description) return null;
    const marker = '<!--INSPECTION_REPORT-->';
    if (description.includes(marker)) {
      try {
        const jsonStr = description.split(marker)[1].trim();
        return JSON.parse(jsonStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  async findAll(query?: {
    make?: string;
    model?: string;
    fuelType?: string;
    transmission?: string;
    status?: string;
    branchId?: number;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
  }) {
    const where: Prisma.vehiclesWhereInput = {};

    if (query?.make) where.make = { equals: query.make, mode: 'insensitive' };
    if (query?.model) where.model = { contains: query.model, mode: 'insensitive' };
    if (query?.fuelType) where.fuel_type = { equals: query.fuelType, mode: 'insensitive' };
    if (query?.transmission) where.transmission = { equals: query.transmission, mode: 'insensitive' };
    if (query?.status) where.status = query.status;
    if (query?.branchId) where.branch_id = Number(query.branchId);

    if (query?.minPrice || query?.maxPrice) {
      where.price = {};
      if (query.minPrice) where.price.gte = Number(query.minPrice);
      if (query.maxPrice) where.price.lte = Number(query.maxPrice);
    }

    if (query?.search) {
      where.OR = [
        { make: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
        { registration_number: { contains: query.search, mode: 'insensitive' } },
        { color: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const list = await this.prisma.vehicles.findMany({
      where,
      include: {
        branches: true,
      },
      orderBy: { vehicle_id: 'desc' },
    });

    return list.map((v) => ({
      ...v,
      inspectionReport: this.extractInspectionReport(v.description),
    }));
  }

  async findOne(id: number) {
    const vehicle = await this.prisma.vehicles.findUnique({
      where: { vehicle_id: id },
      include: {
        branches: true,
        leads: {
          take: 5,
          include: { customers: true },
        },
        test_drives: {
          take: 5,
          include: { customers: true },
        },
        sales: {
          include: { customers: true, employees: true },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    return {
      ...vehicle,
      inspectionReport: this.extractInspectionReport(vehicle.description),
    };
  }

  async updateInspectionReport(id: number, inspectionReport: any) {
    const existing = await this.findOne(id);
    const marker = '<!--INSPECTION_REPORT-->';
    const cleanDesc = (existing.description || '').split(marker)[0].trim();
    const newDescription = `${cleanDesc}\n\n${marker}\n${JSON.stringify(inspectionReport)}`;

    const updated = await this.prisma.vehicles.update({
      where: { vehicle_id: id },
      data: { description: newDescription },
      include: { branches: true },
    });

    this.eventsGateway.emitNotification({
      title: 'Vehicle Inspected & Certified',
      message: `${updated.make} ${updated.model} (${updated.registration_number || 'ID ' + updated.vehicle_id}) inspection report updated: ${inspectionReport.certificationTier || 'Certified'}.`,
      branchId: updated.branch_id,
    });

    return {
      ...updated,
      inspectionReport,
    };
  }

  async create(data: any) {
    let description = data.description || '';
    if (data.inspectionReport) {
      const marker = '<!--INSPECTION_REPORT-->';
      const cleanDesc = description.split(marker)[0].trim();
      description = `${cleanDesc}\n\n${marker}\n${JSON.stringify(data.inspectionReport)}`;
    }
    const createData = { ...data, description };
    delete createData.inspectionReport;

    const created = await this.prisma.vehicles.create({
      data: this.normalizeVehicleData(createData) as Prisma.vehiclesCreateInput,
      include: {
        branches: true,
      },
    });

    this.eventsGateway.emitCarAvailabilityUpdated({
      vehicleId: created.vehicle_id,
      status: created.status || 'Available',
      make: created.make,
      model: created.model,
      branchId: created.branch_id,
    });

    this.eventsGateway.emitNotification({
      title: 'New Vehicle Added',
      message: `${created.make} ${created.model} added to inventory.`,
      branchId: created.branch_id,
    });

    return {
      ...created,
      inspectionReport: this.extractInspectionReport(created.description),
    };
  }

  async update(id: number, data: Prisma.vehiclesUpdateInput) {
    await this.findOne(id);
    const updated = await this.prisma.vehicles.update({
      where: { vehicle_id: id },
      data: this.normalizeVehicleData(data) as Prisma.vehiclesUpdateInput,
    });

    if (data.status) {
      this.eventsGateway.emitCarAvailabilityUpdated({
        vehicleId: updated.vehicle_id,
        status: String(data.status),
        make: updated.make,
        model: updated.model,
        branchId: updated.branch_id,
      });

      this.eventsGateway.emitNotification({
        title: 'Vehicle Status Changed',
        message: `${updated.make} ${updated.model} status updated to ${data.status}.`,
        branchId: updated.branch_id,
      });
    }

    return updated;
  }

  async remove(id: number) {
    const existing = await this.findOne(id);
    const result = await this.prisma.vehicles.delete({
      where: { vehicle_id: id },
    });

    this.eventsGateway.emitNotification({
      title: 'Vehicle Removed',
      message: `${existing.make} ${existing.model} removed from inventory.`,
      branchId: existing.branch_id,
    });

    return result;
  }


  async getStats() {
    const totalVehicles = await this.prisma.vehicles.count();
    const availableVehicles = await this.prisma.vehicles.count({ where: { status: 'Available' } });
    const reservedVehicles = await this.prisma.vehicles.count({ where: { status: 'Reserved' } });
    const soldVehicles = await this.prisma.vehicles.count({ where: { status: 'Sold' } });

    return {
      totalVehicles,
      availableVehicles,
      reservedVehicles,
      soldVehicles,
    };
  }
}
