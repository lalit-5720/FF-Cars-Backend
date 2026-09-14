import { VehiclesService } from './vehicles.service';

describe('VehiclesService', () => {
  it('should normalize date strings for Prisma vehicle date fields', async () => {
    const prisma = {
      vehicles: {
        findUnique: jest.fn().mockResolvedValue({ vehicle_id: 1 }),
        update: jest.fn().mockResolvedValue({ vehicle_id: 1 }),
      },
    } as any;

    const service = new VehiclesService(prisma);

    const payload = {
      insurance_valid_till: '2026-05-15',
      purchase_date: '2025-01-01',
    } as any;

    const normalized = (service as any).normalizeVehicleData(payload);

    expect(normalized.insurance_valid_till).toBeInstanceOf(Date);
    expect(normalized.purchase_date).toBeInstanceOf(Date);
    expect(normalized.insurance_valid_till.toISOString()).toContain('2026-05-15');
  });
});
