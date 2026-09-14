import { BiService } from './bi.service';

describe('BiService executive dashboard', () => {
  const sales = {
    findMany: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
  };
  const leads = { count: jest.fn() };
  const vehicles = { findMany: jest.fn(), count: jest.fn() };
  const branches = { findMany: jest.fn() };
  const testDrives = { count: jest.fn(), findMany: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate executive KPIs from current operational data', async () => {
    sales.aggregate.mockResolvedValue({
      _sum: { final_amount: 1200000, selling_price: 1200000 },
      _count: { sale_id: 3 },
    });
    sales.findMany.mockResolvedValue([
      { sale_date: '2026-08-01', final_amount: 500000, vehicles: { make: 'BMW', model: '3 Series' }, branches: { branch_name: 'Branch 1' } },
      { sale_date: '2026-08-05', final_amount: 400000, vehicles: { make: 'Audi', model: 'A4' }, branches: { branch_name: 'Branch 1' } },
      { sale_date: '2026-08-10', final_amount: 300000, vehicles: { make: 'Hyundai', model: 'Creta' }, branches: { branch_name: 'Branch 2' } },
    ]);
    leads.count.mockResolvedValue(12);
    vehicles.findMany.mockResolvedValue([
      { vehicle_id: 1, price: 500000, status: 'Available', created_at: '2026-07-01' },
      { vehicle_id: 2, price: 400000, status: 'Available', created_at: '2026-07-15' },
      { vehicle_id: 3, price: 300000, status: 'Sold', created_at: '2026-07-30' },
    ]);
    branches.findMany.mockResolvedValue([
      { branch_id: 1, branch_name: 'Branch 1', _count: { sales: 2, vehicles: 2 } },
      { branch_id: 2, branch_name: 'Branch 2', _count: { sales: 1, vehicles: 1 } },
    ]);
    testDrives.count.mockResolvedValue(10);
    testDrives.findMany.mockResolvedValue([
      { test_drive_id: 1, status: 'Completed' },
      { test_drive_id: 2, status: 'Scheduled' },
      { test_drive_id: 3, status: 'Completed' },
      { test_drive_id: 4, status: 'Cancelled' },
    ]);

    const service = new BiService({
      sales,
      leads,
      vehicles,
      branches,
      testDrives,
    } as any);

    const result = await service.getExecutiveDashboard({
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    });

    expect(result.totalRevenue).toBe(1200000);
    expect(result.totalSales).toBe(3);
    expect(result.bestBranch).toMatchObject({ branchName: 'Branch 1' });
    expect(result.leadConversion).toBeGreaterThan(0);
    expect(result.testDriveConversion).toBeGreaterThan(0);
  });

  it('should return empty KPI state when there is no data', async () => {
    sales.aggregate.mockResolvedValue({ _sum: { final_amount: 0, selling_price: 0 }, _count: { sale_id: 0 } });
    sales.findMany.mockResolvedValue([]);
    leads.count.mockResolvedValue(0);
    vehicles.findMany.mockResolvedValue([]);
    branches.findMany.mockResolvedValue([]);
    testDrives.count.mockResolvedValue(0);
    testDrives.findMany.mockResolvedValue([]);

    const service = new BiService({ sales, leads, vehicles, branches, testDrives } as any);
    const result = await service.getExecutiveDashboard({ startDate: '2026-08-01', endDate: '2026-08-31' });

    expect(result.totalSales).toBe(0);
    expect(result.totalRevenue).toBe(0);
    expect(result.leadConversion).toBe(0);
    expect(result.testDriveConversion).toBe(0);
    expect(result.bestBranch).toBeNull();
  });
});
