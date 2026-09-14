import { SalesService } from './sales.service';

describe('SalesService', () => {
  it('should normalize deposit and loan payment states to valid DB values', () => {
    const service = new SalesService({} as any);

    expect((service as any).normalizePaymentStatus('Deposit Received', 200000, 500000)).toBe('Pending');
    expect((service as any).normalizePaymentStatus('Deposit Received + HDFC Bank Auto Loan', 200000, 500000)).toBe('Pending');
    expect((service as any).normalizePaymentStatus('Paid', 700000, 0)).toBe('Paid');
    expect((service as any).normalizePaymentStatus('Completed', 700000, 0)).toBe('Paid');
    expect((service as any).normalizePaymentStatus('Pending Clearance', 200000, 0)).toBe('Pending');
  });
});
