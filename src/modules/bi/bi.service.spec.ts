import { BadRequestException } from '@nestjs/common';
import { BiService } from './bi.service';

describe('BiService', () => {
  const prisma = {
    sales: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    vehicles: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    branches: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty overview when no data is present', async () => {
    prisma.sales.aggregate.mockResolvedValue({
      _sum: { final_amount: null, selling_price: null },
      _count: { sale_id: 0 },
    });
    prisma.vehicles.count.mockResolvedValue(0);
    prisma.branches.count.mockResolvedValue(0);

    const service = new BiService(prisma as any);
    const result = await service.getOverview({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    expect(result.totalRevenue).toBe(0);
    expect(result.totalSales).toBe(0);
    expect(result.totalVehicles).toBe(0);
    expect(result.branchCount).toBe(0);
  });

  it('should reject invalid date ranges', async () => {
    const service = new BiService(prisma as any);

    await expect(
      service.getOverview({
        startDate: '2024-02-30',
        endDate: '2024-01-15',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should support branch filtering for sales summaries', async () => {
    prisma.sales.aggregate.mockResolvedValue({
      _sum: { final_amount: 250000, selling_price: 250000 },
      _count: { sale_id: 2 },
    });

    const service = new BiService(prisma as any);
    const result = await service.getSalesSummary({
      branchId: 2,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    expect(result.totalRevenue).toBe(250000);
    expect(result.totalSales).toBe(2);
  });
});
