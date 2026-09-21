import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BiQueryDto } from './bi.dto';

@Injectable()
export class BiService {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(value: unknown): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private normalizeDateRange(query: Partial<BiQueryDto>) {
    const { startDate, endDate } = query;

    if (startDate) {
      const start = new Date(startDate);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException('Invalid startDate. Use ISO format YYYY-MM-DD.');
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (Number.isNaN(end.getTime())) {
        throw new BadRequestException('Invalid endDate. Use ISO format YYYY-MM-DD.');
      }
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        throw new BadRequestException('startDate must be earlier than or equal to endDate.');
      }
    }

    const normalizedStart = startDate ? new Date(`${startDate}T00:00:00.000Z`) : undefined;
    const normalizedEnd = endDate ? new Date(`${endDate}T23:59:59.999Z`) : undefined;

    return {
      startDate: normalizedStart,
      endDate: normalizedEnd,
    };
  }

  private buildDateFilter(field: string, query: Partial<BiQueryDto>) {
    const { startDate, endDate } = this.normalizeDateRange(query);

    const dateFilter: Record<string, any> = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    return Object.keys(dateFilter).length > 0 ? { [field]: dateFilter } : {};
  }

  private buildBranchFilter(branchId?: number) {
    const normalized = Number(branchId ?? 0);
    return normalized > 0 ? { branch_id: normalized } : {};
  }

  private buildVehicleFilter(vehicleId?: number) {
    const normalized = Number(vehicleId ?? 0);
    return normalized > 0 ? { vehicle_id: normalized } : {};
  }

  private async safeCount<T>(operation: () => Promise<T> | T | undefined | null): Promise<number> {
    try {
      const result = await Promise.resolve(operation());
      return Number(result ?? 0);
    } catch {
      return 0;
    }
  }

  async getOverview(query: Partial<BiQueryDto> = {}) {
    const salesWhere = {
      ...this.buildBranchFilter(query.branchId),
      ...this.buildVehicleFilter(query.vehicleId),
      ...this.buildDateFilter('sale_date', query),
    };

    const salesWithVehicles = await this.prisma.sales.findMany({
      where: salesWhere,
      select: {
        sale_id: true,
        final_amount: true,
        selling_price: true,
        sale_date: true,
        vehicles: {
          select: {
            purchase_price: true,
            purchase_date: true,
            created_at: true,
          },
        },
      },
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalDaysToSell = 0;
    let daysToSellCount = 0;

    for (const s of salesWithVehicles) {
      const rev = this.toNumber(s.final_amount ?? s.selling_price ?? 0);
      const cost = this.toNumber(s.vehicles?.purchase_price ?? 0);
      totalRevenue += rev;
      totalCost += cost;

      const pDate = s.vehicles?.purchase_date || s.vehicles?.created_at;
      if (pDate && s.sale_date) {
        const days = Math.max(0, Math.floor((new Date(s.sale_date).getTime() - new Date(pDate).getTime()) / (1000 * 60 * 60 * 24)));
        totalDaysToSell += days;
        daysToSellCount++;
      }
    }

    const totalSales = salesWithVehicles.length;
    const grossProfit = totalRevenue - totalCost;
    const avgDaysToSell = daysToSellCount > 0 ? Math.round(totalDaysToSell / daysToSellCount) : null;
    const averageSellingPrice = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Available Inventory Value for the branch / dealership
    const availableVehicles = await this.prisma.vehicles.findMany({
      where: {
        status: 'Available',
        ...this.buildBranchFilter(query.branchId),
        ...(query.vehicleId ? { vehicle_id: Number(query.vehicleId) } : {}),
      },
      select: {
        price: true,
      },
    });

    const inventoryValue = availableVehicles.reduce((sum, v) => sum + this.toNumber(v.price || 0), 0);
    const currentInventory = availableVehicles.length;

    // Total registered vehicles count matching branch
    const totalVehicles = await this.prisma.vehicles.count({
      where: {
        ...this.buildBranchFilter(query.branchId),
        ...(query.vehicleId ? { vehicle_id: Number(query.vehicleId) } : {}),
      },
    });

    const branchCount = await this.prisma.branches.count({
      where: this.buildBranchFilter(query.branchId),
    });

    // Branch Leads & Conversion
    const branchIdNum = Number(query.branchId);
    const leadsCount = await this.prisma.leads.count({
      where: {
        ...this.buildDateFilter('inquiry_date', query),
        ...(branchIdNum > 0
          ? {
              OR: [
                { employees: { branch_id: branchIdNum } },
                { vehicles: { branch_id: branchIdNum } },
              ],
            }
          : {}),
      },
    });

    const leadConversion = leadsCount > 0 ? Number(((totalSales / leadsCount) * 100).toFixed(1)) : 0;

    return {
      totalSales,
      totalRevenue,
      grossProfit,
      inventoryValue,
      avgDaysToSell,
      leadConversion,
      totalVehicles,
      currentInventory,
      averageSellingPrice,
      branchCount,
      leadsCount,
      filters: {
        branchId: query.branchId ?? null,
        vehicleId: query.vehicleId ?? null,
        startDate: query.startDate ?? null,
        endDate: query.endDate ?? null,
      },
    };
  }

  async getSalesSummary(query: Partial<BiQueryDto> = {}) {
    const salesWhere = {
      ...this.buildBranchFilter(query.branchId),
      ...this.buildVehicleFilter(query.vehicleId),
      ...this.buildDateFilter('sale_date', query),
    };

    const sales = (await this.prisma.sales.findMany({
      where: salesWhere,
      select: {
        sale_id: true,
        final_amount: true,
        selling_price: true,
        sale_date: true,
        branches: {
          select: {
            branch_name: true,
          },
        },
        vehicles: {
          select: {
            make: true,
            model: true,
          },
        },
      },
      orderBy: { sale_date: 'desc' },
    })) ?? [];

    const aggregate = (await this.prisma.sales.aggregate({
      where: salesWhere,
      _sum: {
        final_amount: true,
        selling_price: true,
      },
      _count: {
        sale_id: true,
      },
    })) ?? {
      _sum: { final_amount: 0, selling_price: 0 },
      _count: { sale_id: 0 },
    };

    const totalRevenue = this.toNumber(aggregate._sum?.final_amount ?? aggregate._sum?.selling_price ?? 0);
    const totalSales = Number(aggregate._count?.sale_id ?? sales.length ?? 0);

    const byBranch = sales.reduce<Record<string, number>>((acc, row) => {
      const branchName = row.branches?.branch_name ?? 'Unknown';
      acc[branchName] = (acc[branchName] ?? 0) + this.toNumber(row.final_amount ?? row.selling_price ?? 0);
      return acc;
    }, {});

    return {
      totalSales,
      totalRevenue,
      averageSaleValue: totalSales > 0 ? totalRevenue / totalSales : 0,
      salesByBranch: Object.entries(byBranch).map(([branch, value]) => ({ branch, value })),
      records: sales.map((sale) => ({
        saleId: sale.sale_id,
        date: sale.sale_date,
        revenue: this.toNumber(sale.final_amount ?? sale.selling_price ?? 0),
        branch: sale.branches?.branch_name ?? 'Unknown',
        vehicle: sale.vehicles ? `${sale.vehicles.make} ${sale.vehicles.model}`.trim() : 'Unknown',
      })),
    };
  }

  async getInventorySummary(query: Partial<BiQueryDto> = {}) {
    const inventoryWhere = {
      ...this.buildBranchFilter(query.branchId),
      ...(query.vehicleId ? { vehicle_id: Number(query.vehicleId) } : {}),
    };

    const vehicles = (await this.prisma.vehicles.findMany({
      where: inventoryWhere,
      select: {
        vehicle_id: true,
        price: true,
        purchase_price: true,
        status: true,
        purchase_date: true,
        created_at: true,
        branch_id: true,
      },
    })) ?? [];

    const inventoryValue = vehicles.reduce((sum, vehicle) => sum + this.toNumber(vehicle.price ?? 0), 0);
    const acquisitionCost = vehicles.reduce((sum, vehicle) => sum + this.toNumber(vehicle.purchase_price ?? 0), 0);

    return {
      totalVehicles: vehicles.length,
      inventoryValue,
      acquisitionCost,
      capitalLocked: inventoryValue,
      soldVehicles: vehicles.filter((vehicle) => (vehicle.status ?? '').toLowerCase() === 'sold').length,
      availableVehicles: vehicles.filter((vehicle) => (vehicle.status ?? '').toLowerCase() === 'available').length,
      ageing: {
        '0-30': vehicles.filter((vehicle) => this.vehicleAgeInDays(vehicle.purchase_date || vehicle.created_at) <= 30).length,
        '31-60': vehicles.filter((vehicle) => {
          const days = this.vehicleAgeInDays(vehicle.purchase_date || vehicle.created_at);
          return days > 30 && days <= 60;
        }).length,
        '61-90': vehicles.filter((vehicle) => {
          const days = this.vehicleAgeInDays(vehicle.purchase_date || vehicle.created_at);
          return days > 60 && days <= 90;
        }).length,
        '91-120': vehicles.filter((vehicle) => {
          const days = this.vehicleAgeInDays(vehicle.purchase_date || vehicle.created_at);
          return days > 90 && days <= 120;
        }).length,
        '120+': vehicles.filter((vehicle) => this.vehicleAgeInDays(vehicle.purchase_date || vehicle.created_at) > 120).length,
      },
    };
  }

  async getBranchesSummary(query: Partial<BiQueryDto> = {}) {
    const branchWhere = this.buildBranchFilter(query.branchId);

    const branches = (await this.prisma.branches.findMany({
      where: branchWhere,
      select: {
        branch_id: true,
        branch_name: true,
        _count: {
          select: {
            sales: true,
            vehicles: true,
          },
        },
      },
    })) ?? [];

    return branches.map((branch) => ({
      branchId: branch.branch_id,
      branchName: branch.branch_name,
      salesCount: branch._count.sales,
      inventoryCount: branch._count.vehicles,
    }));
  }

  async getExecutiveDashboard(query: Partial<BiQueryDto> = {}) {
    const prisma = this.prisma as any;
    const testDrivesRepo = prisma.test_drives ?? prisma.testDrives ?? { count: async () => 0, findMany: async () => [] };

    const salesWhere = {
      ...this.buildBranchFilter(query.branchId),
      ...this.buildVehicleFilter(query.vehicleId),
      ...this.buildDateFilter('sale_date', query),
    };

    const salesAggregate = (await this.prisma.sales.aggregate({
      where: salesWhere,
      _sum: {
        final_amount: true,
        selling_price: true,
      },
      _count: {
        sale_id: true,
      },
    })) ?? {
      _sum: { final_amount: 0, selling_price: 0 },
      _count: { sale_id: 0 },
    };

    const allSales = (await this.prisma.sales.findMany({
      where: salesWhere,
      select: {
        sale_id: true,
        final_amount: true,
        selling_price: true,
        sale_date: true,
        branch_id: true,
        branches: {
          select: { branch_name: true },
        },
        vehicles: {
          select: {
            purchase_price: true,
            purchase_date: true,
            created_at: true,
          },
        },
      },
    })) ?? [];

    const totalRevenue = this.toNumber(salesAggregate._sum?.final_amount ?? salesAggregate._sum?.selling_price ?? 0);
    const totalSales = Number(salesAggregate._count?.sale_id ?? 0);
    const averageSellingPrice = totalSales > 0 ? totalRevenue / totalSales : 0;

    const branchRevenue = new Map<string, number>();
    const branchSales = new Map<string, number>();
    let grossProfit = 0;
    let totalDaysToSell = 0;
    let daysToSellCount = 0;

    for (const sale of allSales) {
      const branchName = sale.branches?.branch_name ?? 'Unknown';
      const value = this.toNumber(sale.final_amount ?? sale.selling_price ?? 0);
      const cost = this.toNumber(sale.vehicles?.purchase_price ?? 0);
      grossProfit += (value - cost);

      const pDate = sale.vehicles?.purchase_date || sale.vehicles?.created_at;
      if (pDate && sale.sale_date) {
        totalDaysToSell += Math.max(0, Math.floor((new Date(sale.sale_date).getTime() - new Date(pDate).getTime()) / (1000 * 60 * 60 * 24)));
        daysToSellCount++;
      }

      branchRevenue.set(branchName, (branchRevenue.get(branchName) ?? 0) + value);
      branchSales.set(branchName, (branchSales.get(branchName) ?? 0) + 1);
    }

    const avgDaysToSell = daysToSellCount > 0 ? Math.round(totalDaysToSell / daysToSellCount) : null;

    const bestBranch = [...branchRevenue.entries()].sort((a, b) => b[1] - a[1])[0];

    const leadsCount = await this.safeCount(() =>
      this.prisma.leads.count({
        where: {
          ...this.buildDateFilter('inquiry_date', query),
          ...(Number(query.branchId) > 0 ? { employees: { branch_id: Number(query.branchId) } } : {}),
        },
      }),
    );

    const salesLeads = totalSales;

    const leadConversion = leadsCount > 0 ? (salesLeads / leadsCount) * 100 : 0;

    const testDriveCount = await this.safeCount(() =>
      testDrivesRepo.count({
        where: {
          ...this.buildDateFilter('test_drive_date', query),
          ...(Number(query.branchId) > 0 ? { employees: { branch_id: Number(query.branchId) } } : {}),
        },
      }),
    );

    const completedTestDrives = this.safeCount(() =>
      Promise.resolve(
        testDrivesRepo.findMany({
          where: {
            ...this.buildDateFilter('test_drive_date', query),
            ...(Number(query.branchId) > 0 ? { employees: { branch_id: Number(query.branchId) } } : {}),
            status: 'Completed',
          },
          select: { test_drive_id: true },
        }) ?? 0,
      ).then((rows) => Array.isArray(rows) ? rows.length : Number(rows ?? 0)),
    );

    const completedTestDriveCount = await completedTestDrives;
    const testDriveConversion = testDriveCount > 0 ? (completedTestDriveCount / testDriveCount) * 100 : 0;

    const inventorySummary = await this.getInventorySummary(query);

    return {
      totalSales,
      totalRevenue,
      grossProfit,
      avgDaysToSell,
      currentInventory: inventorySummary.totalVehicles,
      averageSellingPrice,
      leadConversion: Number(leadConversion.toFixed(2)),
      testDriveConversion: Number(testDriveConversion.toFixed(2)),
      bestBranch: bestBranch
        ? {
            branchName: bestBranch[0],
            revenue: bestBranch[1],
            salesCount: branchSales.get(bestBranch[0]) ?? 0,
          }
        : null,
      inventoryValue: inventorySummary.inventoryValue,
      capitalLocked: inventorySummary.capitalLocked,
      branchPerformance: [...branchRevenue.entries()].map(([branchName, revenue]) => ({
        branchName,
        revenue,
        salesCount: branchSales.get(branchName) ?? 0,
      })),
      filters: {
        branchId: query.branchId ?? null,
        vehicleId: query.vehicleId ?? null,
        startDate: query.startDate ?? null,
        endDate: query.endDate ?? null,
      },
    };
  }

  async getRevenueTrend(query: Partial<BiQueryDto> = {}, granularity = 'monthly') {
    const now = new Date();
    const dateWhere = this.buildDateFilter('sale_date', query);
    
    // Add strict <= NOW() date filter to prevent future sales leaking into trend
    const salesWhere: any = {
      ...this.buildBranchFilter(query.branchId),
      ...this.buildVehicleFilter(query.vehicleId),
      ...dateWhere,
      sale_date: {
        ...(dateWhere.sale_date || {}),
        lte: now,
      },
    };

    const rows = (await (this.prisma.sales as any).findMany({
      where: salesWhere,
      select: { sale_date: true, final_amount: true, selling_price: true },
      orderBy: { sale_date: 'asc' },
    })) ?? [];

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Generate past 6 continuous monthly buckets ending at current month
    const buckets = new Map<string, { period: string; revenue: number; sales: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      buckets.set(key, { period: label, revenue: 0, sales: 0 });
    }

    for (const row of rows) {
      if (!row.sale_date) continue;
      const date = new Date(row.sale_date);
      if (Number.isNaN(date.getTime()) || date > now) continue;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      const value = this.toNumber(row.final_amount ?? row.selling_price);

      if (buckets.has(key)) {
        const item = buckets.get(key)!;
        item.revenue += value;
        item.sales += 1;
      } else {
        // If row is older than 6 months but within query range
        buckets.set(key, { period: label, revenue: value, sales: 1 });
      }
    }

    return [...buckets.values()];
  }

  async getTopVehicles(query: Partial<BiQueryDto> = {}, limit = 5) {
    const rows = (await (this.prisma.sales as any).findMany({
      where: { ...this.buildBranchFilter(query.branchId), ...this.buildVehicleFilter(query.vehicleId), ...this.buildDateFilter('sale_date', query) },
      select: {
        final_amount: true,
        selling_price: true,
        vehicles: {
          select: {
            vehicle_id: true,
            make: true,
            model: true,
            image_url: true,
            registration_number: true,
          },
        },
      },
    })) ?? [];
    const grouped = new Map<string, any>();
    for (const row of rows) {
      const name = `${row.vehicles?.make ?? 'Unknown'} ${row.vehicles?.model ?? ''}`.trim();
      const item = grouped.get(name) ?? {
        vehicle_id: row.vehicles?.vehicle_id,
        vehicle: name,
        make: row.vehicles?.make,
        model: row.vehicles?.model,
        image_url: row.vehicles?.image_url,
        registration_number: row.vehicles?.registration_number,
        sales: 0,
        revenue: 0,
      };
      item.sales += 1;
      item.revenue += this.toNumber(row.final_amount ?? row.selling_price);
      grouped.set(name, item);
    }
    return [...grouped.values()].sort((a, b) => b.revenue - a.revenue).slice(0, Math.max(1, Math.min(50, Number(limit) || 5)));
  }

  async getSalesBreakdown(query: Partial<BiQueryDto> = {}, by = 'brand') {
    const rows = (await (this.prisma.sales as any).findMany({ where: { ...this.buildBranchFilter(query.branchId), ...this.buildVehicleFilter(query.vehicleId), ...this.buildDateFilter('sale_date', query) }, select: { final_amount: true, selling_price: true, vehicles: { select: { make: true, model: true, fuel_type: true } } } })) ?? [];
    const grouped = new Map<string, { sales: number; revenue: number }>();
    for (const row of rows) { const vehicle = row.vehicles; const key = by === 'model' ? vehicle?.model : by === 'fuelType' ? vehicle?.fuel_type : vehicle?.make; const item = grouped.get(key || 'Unknown') ?? { sales: 0, revenue: 0 }; item.sales += 1; item.revenue += this.toNumber(row.final_amount ?? row.selling_price); grouped.set(key || 'Unknown', item); }
    return [...grouped.entries()].map(([label, value]) => ({ label, ...value }));
  }

  async getFunnel(query: Partial<BiQueryDto> = {}) {
    const dateFilter = this.buildDateFilter('created_at', query);
    const branchFilter = Number(query.branchId) > 0 ? { employees: { branch_id: Number(query.branchId) } } : {};
    const [leads, testDrives, qualifiedLeads, sales] = await Promise.all([
      this.safeCount(() => this.prisma.leads.count({ where: { ...dateFilter, ...branchFilter } })),
      this.safeCount(() => this.prisma.test_drives.count({ where: { ...dateFilter, ...branchFilter } })),
      this.safeCount(() => this.prisma.leads.count({
        where: {
          ...dateFilter,
          ...branchFilter,
          status: { in: ['Qualified', 'Converted', 'Contacted'] },
        },
      })),
      this.safeCount(() => this.prisma.sales.count({ where: { ...dateFilter, ...this.buildBranchFilter(query.branchId), ...this.buildVehicleFilter(query.vehicleId) } })),
    ]);

    const conversionRate = leads > 0 ? Number(((sales / leads) * 100).toFixed(1)) : 0;

    return {
      conversionRate,
      stages: [
        { label: 'Leads', count: leads },
        { label: 'Test Drives', count: testDrives },
        { label: 'Qualified', count: Math.max(qualifiedLeads, sales) },
        { label: 'Sales', count: sales },
      ],
    };
  }

  async getInventoryAging(query: Partial<BiQueryDto> = {}) {
    const vehicles = (await this.prisma.vehicles.findMany({
      where: {
        ...this.buildBranchFilter(query.branchId),
        ...(query.vehicleId ? { vehicle_id: Number(query.vehicleId) } : {}),
        status: 'Available',
      },
      select: { price: true, purchase_date: true, created_at: true },
    })) ?? [];

    const buckets = [
      { label: '0 - 30 Days', count: 0, value: 0, color: '#3b82f6' },
      { label: '31 - 60 Days', count: 0, value: 0, color: '#10b981' },
      { label: '61 - 90 Days', count: 0, value: 0, color: '#f59e0b' },
      { label: '91 - 120 Days', count: 0, value: 0, color: '#ef4444' },
      { label: '120+ Days', count: 0, value: 0, color: '#b91c1c' },
    ];

    for (const vehicle of vehicles) {
      const age = this.vehicleAgeInDays(vehicle.purchase_date || vehicle.created_at);
      const bucket = buckets[age <= 30 ? 0 : age <= 60 ? 1 : age <= 90 ? 2 : age <= 120 ? 3 : 4];
      bucket.count += 1;
      bucket.value += this.toNumber(vehicle.price);
    }
    return buckets;
  }

  getVehicleDemand() {
    return { available: false, reason: 'Vehicle demand analysis requires wishlist data, which is not present in the current schema.', items: [] };
  }

  async getEmployeePerformance(query: Partial<BiQueryDto> = {}) {
    const branchFilter = Number(query.branchId) > 0 ? { branch_id: Number(query.branchId) } : {};

    const employees = await this.prisma.employees.findMany({
      where: {
        status: 'Active',
        ...branchFilter,
      },
      select: {
        employee_id: true,
        first_name: true,
        last_name: true,
        role: true,
        branch_id: true,
        branches: {
          select: { branch_name: true },
        },
        sales: {
          select: {
            sale_id: true,
            final_amount: true,
            selling_price: true,
          },
        },
        leads: {
          select: {
            lead_id: true,
            status: true,
          },
        },
        test_drives: {
          select: {
            test_drive_id: true,
            status: true,
          },
        },
      },
    });

    return employees.map((emp) => {
      const salesCount = emp.sales.length;
      const totalRevenue = emp.sales.reduce((sum, s) => sum + this.toNumber(s.final_amount ?? s.selling_price ?? 0), 0);
      const leadsCount = emp.leads.length;
      const convertedLeads = emp.leads.filter((l) => (l.status ?? '').toLowerCase() === 'closed' || (l.status ?? '').toLowerCase() === 'won').length;
      const testDrivesCount = emp.test_drives.length;

      return {
        employeeId: emp.employee_id,
        name: `${emp.first_name} ${emp.last_name || ''}`.trim(),
        role: emp.role,
        branchName: emp.branches?.branch_name ?? 'Unknown',
        salesCount,
        totalRevenue,
        leadsCount,
        convertedLeads,
        testDrivesCount,
        conversionRate: leadsCount > 0 ? Number(((convertedLeads / leadsCount) * 100).toFixed(1)) : 0,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  async getPaymentsHealth(query: Partial<BiQueryDto> = {}) {
    const salesWhere = this.buildBranchFilter(query.branchId);

    const sales = await this.prisma.sales.findMany({
      where: salesWhere,
      select: {
        sale_id: true,
        final_amount: true,
        selling_price: true,
        deposit_amount: true,
        payment_status: true,
        payments: {
          select: {
            amount_paid: true,
            payment_status: true,
            payment_method: true,
          },
        },
      },
    });

    let totalContractValue = 0;
    let totalCollected = 0;
    const methodCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    for (const sale of sales) {
      const val = this.toNumber(sale.final_amount ?? sale.selling_price ?? 0);
      totalContractValue += val;

      const pStatus = sale.payment_status || 'Pending';
      statusCounts[pStatus] = (statusCounts[pStatus] || 0) + 1;

      for (const p of sale.payments) {
        if ((p.payment_status || '').toLowerCase() === 'completed' || (p.payment_status || '').toLowerCase() === 'success' || (p.payment_status || '').toLowerCase() === 'paid') {
          const amt = this.toNumber(p.amount_paid);
          totalCollected += amt;

          const method = p.payment_method || 'Other';
          methodCounts[method] = (methodCounts[method] || 0) + amt;
        }
      }
    }

    const totalOutstanding = Math.max(0, totalContractValue - totalCollected);
    const collectionPercentage = totalContractValue > 0 ? Number(((totalCollected / totalContractValue) * 100).toFixed(1)) : 0;

    return {
      totalContractValue,
      totalCollected,
      totalOutstanding,
      collectionPercentage,
      methodBreakdown: Object.entries(methodCounts).map(([method, amount]) => ({ method, amount })),
      statusBreakdown: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    };
  }

  async getReviewSentiment() {
    const reviews = await this.prisma.reviews.findMany({
      select: {
        review_id: true,
        rating: true,
        is_published: true,
        created_at: true,
      },
    });

    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2)) : 5.0;

    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    return {
      totalReviews,
      avgRating,
      publishedCount: reviews.filter((r) => r.is_published).length,
      pendingCount: reviews.filter((r) => !r.is_published).length,
      ratingDistribution,
    };
  }

  async getBranchComparison() {
    const branches = await this.prisma.branches.findMany({
      include: {
        vehicles: {
          select: { price: true, status: true },
        },
        sales: {
          select: { final_amount: true, selling_price: true },
        },
        employees: {
          select: { employee_id: true },
        },
      },
    });

    return branches.map((b) => {
      const totalSalesCount = b.sales.length;
      const totalRevenue = b.sales.reduce((sum, s) => sum + this.toNumber(s.final_amount ?? s.selling_price ?? 0), 0);
      const availableInventoryCount = b.vehicles.filter((v) => (v.status ?? '').toLowerCase() === 'available').length;
      const totalInventoryValue = b.vehicles.reduce((sum, v) => sum + this.toNumber(v.price ?? 0), 0);
      const avgDealSize = totalSalesCount > 0 ? Number((totalRevenue / totalSalesCount).toFixed(0)) : 0;

      return {
        branchId: b.branch_id,
        branchName: b.branch_name,
        city: b.city,
        employeeCount: b.employees.length,
        totalSalesCount,
        totalRevenue,
        avgDealSize,
        availableInventoryCount,
        totalInventoryValue,
      };
    });
  }

  private vehicleAgeInDays(createdAt: Date | string | null | undefined): number {
    if (!createdAt) return 0;

    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return 0;

    const diffMs = Date.now() - created.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }
}

