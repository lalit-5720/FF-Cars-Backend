import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  private normalizePaymentStatus(paymentStatus?: string, depositAmount?: number, loanAmount?: number) {
    const raw = String(paymentStatus || '').trim();
    const deposit = Number(depositAmount || 0);
    const loan = Number(loanAmount || 0);

    if (!raw) {
      if (loan > 0) return 'Loan Pending';
      if (deposit > 0) return 'Partially Paid';
      return 'Paid';
    }

    const normalized = raw.toLowerCase();
    if (normalized.includes('cancel')) return 'Cancelled';
    if (normalized.includes('partial')) return 'Partially Paid';
    if (normalized.includes('loan') || normalized.includes('sanction')) return 'Loan Pending';
    if (normalized.includes('deposit') || normalized.includes('pending')) return 'Partially Paid';
    if (normalized.includes('approved')) return 'Paid';
    if (normalized.includes('paid') || normalized.includes('completed')) return 'Paid';

    return raw;
  }

  private enrichSale(sale: any) {
    if (!sale) return sale;
    const loan = Number(sale.loan_amount || 0);
    const deposit = Number(sale.deposit_amount || 0);
    const finalAmt = Number(sale.final_amount ?? sale.selling_price ?? 0);
    const pStatus = String(sale.payment_status || '').trim();
    const remarks = String(sale.remarks || '');
    const isCancelled = pStatus.toLowerCase().includes('cancel');

    let loanStatus: 'None' | 'Pending' | 'Approved' | 'Cancelled' = 'None';
    if (isCancelled) {
      loanStatus = 'Cancelled';
    } else if (loan > 0) {
      if (remarks.includes('loan_status:Approved')) {
        loanStatus = 'Approved';
      } else if (remarks.includes('loan_status:Pending')) {
        loanStatus = 'Pending';
      } else if (pStatus.toLowerCase() === 'paid') {
        loanStatus = 'Approved';
      } else {
        loanStatus = 'Pending';
      }
    }

    const bankCommissionRate = 0.02; // 2% excess payout from partner bank on loan amount
    const bankCommissionAmount = loan > 0 ? Math.round(loan * bankCommissionRate) : 0;

    // A sale is cancellable only before loan is approved, not delivered, and not already cancelled
    const canCancel = !isCancelled && loanStatus !== 'Approved' && sale.delivery_status !== 'Delivered';

    return {
      ...sale,
      loan_status: loanStatus,
      bank_commission_rate: bankCommissionRate,
      bank_commission_amount: bankCommissionAmount,
      can_cancel: canCancel,
      is_loan_deal: loan > 0,
      balance_remaining: isCancelled ? 0 : Math.max(0, finalAmt - deposit - (loanStatus === 'Approved' ? loan : 0)),
    };
  }

  async findAll(query?: {
    branchId?: number;
    paymentStatus?: string;
    deliveryStatus?: string;
    employeeId?: number;
    customerId?: number;
  }) {
    const where: Prisma.salesWhereInput = {};

    if (query?.branchId) where.branch_id = Number(query.branchId);
    if (query?.paymentStatus) where.payment_status = query.paymentStatus;
    if (query?.deliveryStatus) where.delivery_status = query.deliveryStatus;
    if (query?.employeeId) where.employee_id = Number(query.employeeId);
    if (query?.customerId) where.customer_id = Number(query.customerId);

    const sales = await this.prisma.sales.findMany({
      where,
      include: {
        customers: true,
        vehicles: true,
        employees: true,
        branches: true,
        payments: true,
        deliveries: true,
      },
      orderBy: { sale_id: 'desc' },
    });

    return sales.map((s) => this.enrichSale(s));
  }

  async findOne(id: number) {
    const sale = await this.prisma.sales.findUnique({
      where: { sale_id: id },
      include: {
        customers: true,
        vehicles: true,
        employees: true,
        branches: true,
        payments: true,
        deliveries: { include: { employees: true } },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale transaction with ID ${id} not found`);
    }

    return this.enrichSale(sale);
  }

  async create(data: any) {
    let customerId = Number(data.customer_id || data.customerId || 1);
    let vehicleId = Number(data.vehicle_id || data.vehicleId || 1);
    let employeeId = Number(data.employee_id || data.employeeId || 1);
    let branchId = Number(data.branch_id || data.branchId || 1);

    const price = Number(data.final_amount || data.finalAmount || data.selling_price || data.sellingPrice || data.price || 500000);
    const rawDeliveryStatus = data.delivery_status || data.deliveryStatus || 'Pending';
    const validDeliveryStatus = (rawDeliveryStatus === 'Scheduled' || rawDeliveryStatus === 'SCHEDULED') ? 'Pending' : rawDeliveryStatus;

    const depositAmount = Number(data.deposit_amount ?? data.depositAmount ?? (data.loan_amount || data.loanAmount ? (data.downpayment ?? 0) : price));
    const loanAmount = Number(data.loan_amount ?? data.loanAmount ?? 0);
    const validPaymentStatus = this.normalizePaymentStatus(data.payment_status || data.paymentStatus, depositAmount, loanAmount);

    const createData: Prisma.salesUncheckedCreateInput = {
      customer_id: customerId,
      vehicle_id: vehicleId,
      branch_id: branchId,
      employee_id: employeeId,
      selling_price: String(data.selling_price || data.sellingPrice || price),
      final_amount: String(price),
      deposit_amount: String(depositAmount),
      loan_amount: String(loanAmount),
      discount: String(data.discount || 0),
      tax: String(data.tax || 0),
      payment_status: validPaymentStatus,
      delivery_status: validDeliveryStatus,
      sale_date: data.sale_date || data.saleDate ? new Date(data.sale_date || data.saleDate) : new Date(),
      remarks: data.remarks
        ? `${data.remarks} ${loanAmount > 0 ? '[loan_status:Pending]' : ''}`.trim()
        : (loanAmount > 0 ? 'Loan Deal - Pending Bank Underwriting [loan_status:Pending]' : 'Full Payment Sale'),
    };

    let newSale: any;
    try {
      newSale = await this.prisma.sales.create({
        data: createData,
        include: {
          customers: true,
          vehicles: true,
          employees: true,
          branches: true,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        await this.prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('public.sales', 'sale_id'), COALESCE((SELECT MAX(sale_id) FROM public.sales), 1));`
        );
        newSale = await this.prisma.sales.create({
          data: createData,
          include: {
            customers: true,
            vehicles: true,
            employees: true,
            branches: true,
          },
        });
      } else {
        throw err;
      }
    }

    // Automatically record down payment in payments table if deposit > 0
    if (depositAmount > 0) {
      await this.prisma.payments.create({
        data: {
          sales: { connect: { sale_id: newSale.sale_id } },
          payment_date: new Date(),
          amount_paid: String(depositAmount),
          payment_method: data.payment_method || 'Bank Transfer',
          payment_status: 'Completed',
          transaction_reference: `DEP-TXN-${newSale.sale_id}-${Date.now()}`,
          remarks: loanAmount > 0 ? 'Upfront Down Payment Collected' : 'Full Upfront Settlement',
        },
      });
    }

    // Update vehicle status
    const targetVehicleStatus = (validPaymentStatus === 'Paid' && loanAmount === 0) ? 'Sold' : 'Reserved';
    await this.prisma.vehicles.update({
      where: { vehicle_id: vehicleId },
      data: { status: targetVehicleStatus },
    });

    return this.enrichSale(newSale);
  }

  async update(id: number, data: any) {
    await this.findOne(id);

    let customerId = data.customer_id || data.customerId ? Number(data.customer_id || data.customerId) : undefined;
    let vehicleId = data.vehicle_id || data.vehicleId ? Number(data.vehicle_id || data.vehicleId) : undefined;
    let employeeId = data.employee_id || data.employeeId ? Number(data.employee_id || data.employeeId) : undefined;
    let branchId = data.branch_id || data.branchId ? Number(data.branch_id || data.branchId) : undefined;

    const rawDeliveryStatus = data.delivery_status || data.deliveryStatus;
    const validDeliveryStatus = (rawDeliveryStatus === 'Scheduled' || rawDeliveryStatus === 'SCHEDULED') ? 'Pending' : rawDeliveryStatus;

    const sellingPrice = data.selling_price !== undefined || data.sellingPrice !== undefined ? Number(data.selling_price ?? data.sellingPrice) : undefined;
    const finalAmount = data.final_amount !== undefined || data.finalAmount !== undefined ? Number(data.final_amount ?? data.finalAmount) : undefined;
    const discount = data.discount !== undefined ? Number(data.discount) : undefined;
    const tax = data.tax !== undefined ? Number(data.tax) : undefined;

    const depositAmount = data.deposit_amount !== undefined || data.depositAmount !== undefined ? Number(data.deposit_amount ?? data.depositAmount ?? 0) : undefined;
    const loanAmount = data.loan_amount !== undefined || data.loanAmount !== undefined ? Number(data.loan_amount ?? data.loanAmount ?? 0) : undefined;
    const hasPaymentStatus = data.payment_status !== undefined || data.paymentStatus !== undefined;
    const validPaymentStatus = hasPaymentStatus
      ? this.normalizePaymentStatus(data.payment_status || data.paymentStatus, depositAmount ?? 0, loanAmount ?? 0)
      : undefined;

    const updateData: Prisma.salesUncheckedUpdateInput = {
      ...(customerId ? { customer_id: customerId } : {}),
      ...(vehicleId ? { vehicle_id: vehicleId } : {}),
      ...(employeeId ? { employee_id: employeeId } : {}),
      ...(branchId ? { branch_id: branchId } : {}),
      ...(depositAmount !== undefined ? { deposit_amount: String(depositAmount) } : {}),
      ...(loanAmount !== undefined ? { loan_amount: String(loanAmount) } : {}),
      ...(sellingPrice !== undefined && Number.isFinite(sellingPrice) ? { selling_price: String(sellingPrice) } : {}),
      ...(finalAmount !== undefined && Number.isFinite(finalAmount) ? { final_amount: String(finalAmount) } : {}),
      ...(discount !== undefined && Number.isFinite(discount) ? { discount: String(discount) } : {}),
      ...(tax !== undefined && Number.isFinite(tax) ? { tax: String(tax) } : {}),
      ...(validPaymentStatus ? { payment_status: validPaymentStatus } : {}),
      ...(validDeliveryStatus ? { delivery_status: validDeliveryStatus } : {}),
      ...(data.remarks ? { remarks: data.remarks } : {}),
    };

    const updated = await this.prisma.sales.update({
      where: { sale_id: id },
      data: updateData,
      include: {
        customers: true,
        vehicles: true,
        employees: true,
        branches: true,
        payments: true,
        deliveries: true,
      },
    });

    return this.enrichSale(updated);
  }

  // --- 1. ACTION: MARK FULL PAID ---
  async markFullPaid(id: number) {
    const sale = await this.findOne(id);
    if (sale.payment_status === 'Paid') {
      return sale;
    }
    if (sale.payment_status === 'Cancelled') {
      throw new BadRequestException('Cannot mark a cancelled purchase as paid.');
    }

    const finalAmount = Number(sale.final_amount ?? sale.selling_price ?? 0);
    const existingDeposit = Number(sale.deposit_amount ?? 0);
    const balanceDue = Math.max(0, finalAmount - existingDeposit);

    if (balanceDue > 0) {
      await this.prisma.payments.create({
        data: {
          sales: { connect: { sale_id: id } },
          payment_date: new Date(),
          amount_paid: String(balanceDue),
          payment_method: 'Full Settlement',
          payment_status: 'Completed',
          transaction_reference: `FULL-SETTLE-${id}-${Date.now()}`,
          remarks: 'Remaining balance settled in full',
        },
      });
    }

    const updated = await this.prisma.sales.update({
      where: { sale_id: id },
      data: {
        payment_status: 'Paid',
        deposit_amount: String(finalAmount),
        remarks: `${sale.remarks || ''} [Full payment completed on ${new Date().toLocaleDateString()}]`.trim(),
      },
      include: {
        customers: true,
        vehicles: true,
        employees: true,
        branches: true,
        payments: true,
      },
    });

    return this.enrichSale(updated);
  }

  // --- 2. ACTION: APPROVE LOAN ---
  async approveLoan(id: number) {
    const sale = await this.findOne(id);
    if (sale.payment_status === 'Cancelled') {
      throw new BadRequestException('Cannot approve loan for a cancelled purchase.');
    }
    if (Number(sale.loan_amount || 0) <= 0) {
      throw new BadRequestException('This sale is not configured as a loan deal.');
    }

    const loanAmt = Number(sale.loan_amount);
    const bankCommission = Math.round(loanAmt * 0.02);

    // Record loan disbursal payment
    await this.prisma.payments.create({
      data: {
        sales: { connect: { sale_id: id } },
        payment_date: new Date(),
        amount_paid: String(loanAmt),
        payment_method: 'Bank Disbursal',
        payment_status: 'Completed',
        transaction_reference: `LOAN-SANCTION-${id}-${Date.now()}`,
        remarks: `Bank loan disbursed. 2% excess commission: ₹${bankCommission.toLocaleString('en-IN')}`,
      },
    });

    const updatedRemarks = `${sale.remarks || ''} [loan_status:Approved, approved_at:${new Date().toISOString()}, bank_commission:${bankCommission}]`.trim();

    const updated = await this.prisma.sales.update({
      where: { sale_id: id },
      data: {
        payment_status: 'Paid',
        remarks: updatedRemarks,
      },
      include: {
        customers: true,
        vehicles: true,
        employees: true,
        branches: true,
        payments: true,
      },
    });

    return this.enrichSale(updated);
  }

  // --- 3. ACTION: CANCEL PURCHASE & RELEASE VEHICLE ---
  async cancelSale(id: number, reason?: string) {
    const sale = await this.findOne(id);
    if (!sale.can_cancel) {
      throw new BadRequestException('Cannot cancel purchase: loan is already approved or vehicle is delivered.');
    }

    // 1. Update sale status to Cancelled
    const updatedRemarks = `${sale.remarks || ''} [Cancelled: ${reason || 'Customer cancellation prior to loan approval'}]`.trim();
    const updated = await this.prisma.sales.update({
      where: { sale_id: id },
      data: {
        payment_status: 'Cancelled',
        delivery_status: 'Cancelled',
        remarks: updatedRemarks,
      },
      include: {
        customers: true,
        vehicles: true,
        employees: true,
        branches: true,
      },
    });

    // 2. CRUCIAL: Release vehicle back to Available
    await this.prisma.vehicles.update({
      where: { vehicle_id: sale.vehicle_id },
      data: { status: 'Available' },
    });

    return this.enrichSale(updated);
  }

  // --- 4. ACTION: MOVE TO DELIVERY ---
  async moveToDelivery(id: number) {
    const sale = await this.findOne(id);
    if (sale.payment_status === 'Cancelled') {
      throw new BadRequestException('Cannot schedule delivery for a cancelled sale.');
    }

    const updated = await this.prisma.sales.update({
      where: { sale_id: id },
      data: {
        delivery_status: 'Scheduled',
      },
      include: {
        customers: true,
        vehicles: true,
        employees: true,
        branches: true,
      },
    });

    // Mark vehicle as Sold
    await this.prisma.vehicles.update({
      where: { vehicle_id: sale.vehicle_id },
      data: { status: 'Sold' },
    });

    // Create delivery record if none exists
    const existingDelivery = await this.prisma.deliveries.findFirst({
      where: { sale_id: id },
    });
    if (!existingDelivery) {
      await this.prisma.deliveries.create({
        data: {
          sale_id: id,
          delivery_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days ahead
          delivered_by: sale.employee_id,
          delivery_status: 'In Progress',
          delivery_notes: 'PDI Inspection & Registration in Progress',
          customer_received: false,
        },
      });
    }

    return this.enrichSale(updated);
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.sales.delete({
      where: { sale_id: id },
    });
  }

  async getRevenueStats() {
    const breakdown = await this.getRevenueBreakdown();
    return {
      totalSalesCount: breakdown.totalSalesCount,
      totalRevenue: breakdown.totalCollectedRevenue, // Actual collected cash
      totalContractValue: breakdown.totalContractValue, // Full contracted value
      totalCollectedRevenue: breakdown.totalCollectedRevenue,
      fullPaymentRevenue: breakdown.fullPayment.totalAmount,
      downPaymentRevenue: breakdown.loanPayment.totalDownPayment,
      totalLoanAmount: breakdown.loanPayment.totalLoanAmount,
      totalBankCommission: breakdown.totalBankCommission,
      totalDiscountGiven: breakdown.totalDiscountGiven,
      breakdown,
    };
  }

  async getRevenueBreakdown() {
    const allSales = await this.prisma.sales.findMany({
      include: {
        customers: true,
        vehicles: true,
        branches: true,
      },
      orderBy: { sale_id: 'desc' },
    });

    let totalDiscountGiven = 0;
    let fullPaymentCount = 0;
    let fullPaymentTotal = 0;

    let loanPaymentCount = 0;
    let loanDownPaymentTotal = 0;
    let loanFinancedTotal = 0;
    let totalBankCommission = 0;

    const deals = allSales.map((s) => {
      const enriched = this.enrichSale(s);
      const finalAmount = Number(s.final_amount ?? s.selling_price ?? 0);
      const discount = Number(s.discount ?? 0);
      const deposit = Number(s.deposit_amount ?? 0);
      const loan = Number(s.loan_amount ?? 0);
      const isCancelled = (s.payment_status || '').toLowerCase().includes('cancel');

      if (!isCancelled) {
        totalDiscountGiven += discount;
        const isLoanDeal = loan > 0;

        if (isLoanDeal) {
          loanPaymentCount++;
          loanDownPaymentTotal += deposit;
          loanFinancedTotal += loan;
          totalBankCommission += enriched.bank_commission_amount;
        } else {
          fullPaymentCount++;
          fullPaymentTotal += finalAmount;
        }
      }

      return {
        sale_id: s.sale_id,
        customer_name: s.customers ? `${s.customers.first_name} ${s.customers.last_name || ''}`.trim() : `Customer #${s.customer_id}`,
        vehicle_name: s.vehicles ? `${s.vehicles.make} ${s.vehicles.model}` : `Vehicle #${s.vehicle_id}`,
        branch_name: s.branches?.branch_name || 'Main Branch',
        type: (loan > 0 ? 'LOAN_FINANCED' : 'FULL_PAYMENT') as 'LOAN_FINANCED' | 'FULL_PAYMENT',
        selling_price: Number(s.selling_price || 0),
        final_amount: finalAmount,
        deposit_amount: deposit,
        loan_amount: loan,
        payment_status: s.payment_status || 'Pending',
        loan_status: enriched.loan_status,
        bank_commission_rate: enriched.bank_commission_rate,
        bank_commission_amount: enriched.bank_commission_amount,
        can_cancel: enriched.can_cancel,
        sale_date: s.sale_date || s.created_at || new Date(),
      };
    });

    const totalCollectedRevenue = fullPaymentTotal + loanDownPaymentTotal;
    const totalContractValue = fullPaymentTotal + loanDownPaymentTotal + loanFinancedTotal;

    return {
      totalSalesCount: allSales.filter(s => !(s.payment_status || '').toLowerCase().includes('cancel')).length,
      totalContractValue,
      totalCollectedRevenue,
      totalBankCommission,
      totalDiscountGiven,
      fullPayment: {
        count: fullPaymentCount,
        totalAmount: fullPaymentTotal,
      },
      loanPayment: {
        count: loanPaymentCount,
        totalDownPayment: loanDownPaymentTotal,
        totalLoanAmount: loanFinancedTotal,
        totalDealValue: loanDownPaymentTotal + loanFinancedTotal,
      },
      deals,
    };
  }
}
