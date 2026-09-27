import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalesExecutiveAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSalesExecutiveDashboard(employeeId: number) {
    const empId = Number(employeeId);

    // 1. Fetch Executive Details
    const employee = await this.prisma.employees.findUnique({
      where: { employee_id: empId },
      include: { branches: true },
    });

    if (!employee) {
      throw new NotFoundException(`Sales Executive with ID ${empId} not found`);
    }

    // 2. Fetch Assigned Leads
    const assignedLeads = await this.prisma.leads.findMany({
      where: { employee_id: empId },
      include: {
        customers: true,
        vehicles: true,
      },
      orderBy: { lead_id: 'desc' },
    });

    const totalLeads = assignedLeads.length;

    const isWon = (status?: string | null) => {
      const s = (status || '').toLowerCase();
      return s.includes('converted') || s.includes('won') || s.includes('purchased') || s.includes('closed');
    };

    const isLost = (status?: string | null) => {
      const s = (status || '').toLowerCase();
      return s.includes('lost') || s.includes('dropped') || s.includes('cancelled') || s.includes('rejected');
    };

    const convertedLeads = assignedLeads.filter((l) => isWon(l.status)).length;
    const lostLeads = assignedLeads.filter((l) => isLost(l.status)).length;
    const activeLeads = assignedLeads.filter((l) => !isWon(l.status) && !isLost(l.status)).length;
    const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;

    // Pipeline Funnel Distribution
    const funnelMap: Record<string, number> = {
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Negotiation: 0,
      'Won / Converted': 0,
      'Lost / Dropped': 0,
    };

    assignedLeads.forEach((l) => {
      const raw = (l.status || 'New').trim();
      const lower = raw.toLowerCase();

      if (isWon(raw)) {
        funnelMap['Won / Converted']++;
      } else if (isLost(raw)) {
        funnelMap['Lost / Dropped']++;
      } else if (lower.includes('negotiat')) {
        funnelMap['Negotiation']++;
      } else if (lower.includes('qualif') || lower.includes('test')) {
        funnelMap['Qualified']++;
      } else if (lower.includes('contact') || lower.includes('follow')) {
        funnelMap['Contacted']++;
      } else {
        funnelMap['New']++;
      }
    });

    const pipelineFunnel = Object.entries(funnelMap).map(([stage, count]) => ({
      stage,
      count,
      percentage: totalLeads > 0 ? Number(((count / totalLeads) * 100).toFixed(1)) : 0,
    }));

    // Lead Sources Distribution
    const sourcesMap: Record<string, number> = {};
    assignedLeads.forEach((l) => {
      const src = (l.source || 'Website').trim();
      sourcesMap[src] = (sourcesMap[src] || 0) + 1;
    });

    const leadSources = Object.entries(sourcesMap).map(([source, count]) => ({
      source,
      count,
      percentage: totalLeads > 0 ? Number(((count / totalLeads) * 100).toFixed(1)) : 0,
    }));

    // Top Priority Leads (Needing executive follow-up)
    const priorityLeads = assignedLeads
      .filter((l) => !isWon(l.status) && !isLost(l.status))
      .sort((a, b) => {
        const interestWeight = (int?: string | null) => (int?.toLowerCase() === 'high' ? 3 : int?.toLowerCase() === 'medium' ? 2 : 1);
        return interestWeight(b.interest_level) - interestWeight(a.interest_level);
      })
      .slice(0, 5)
      .map((l) => ({
        lead_id: l.lead_id,
        customer_name: `${l.customers?.first_name || ''} ${l.customers?.last_name || ''}`.trim() || 'Valued Customer',
        customer_phone: l.customers?.phone || 'N/A',
        vehicle_name: `${l.vehicles?.make || ''} ${l.vehicles?.model || ''}`.trim() || 'Vehicle',
        interest_level: l.interest_level || 'Medium',
        status: l.status || 'New',
        source: l.source || 'Website',
        inquiry_date: l.inquiry_date || l.created_at,
      }));

    // 3. Fetch Closed Sales & Revenue
    const sales = await this.prisma.sales.findMany({
      where: { employee_id: empId },
      include: {
        customers: true,
        vehicles: true,
        branches: true,
      },
      orderBy: { sale_date: 'desc' },
    });

    const totalClosedDeals = sales.length;
    let totalClosedRevenue = 0;
    sales.forEach((s) => {
      totalClosedRevenue += Number(s.final_amount ?? s.selling_price ?? 0);
    });

    const averageDealValue = totalClosedDeals > 0 ? Math.round(totalClosedRevenue / totalClosedDeals) : 0;

    // Monthly Trend Analysis for Sales Executive
    const monthlyMap: Record<string, { deals: number; revenue: number }> = {};
    sales.forEach((s) => {
      const date = s.sale_date || s.created_at || new Date();
      const monthKey = new Date(date).toISOString().slice(0, 7); // e.g. "2026-08"
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { deals: 0, revenue: 0 };
      }
      monthlyMap[monthKey].deals += 1;
      monthlyMap[monthKey].revenue += Number(s.final_amount ?? s.selling_price ?? 0);
    });

    const monthlyTrend = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, stats]) => ({
        month,
        deals: stats.deals,
        revenue: stats.revenue,
      }));

    // 4. Fetch Deliveries Scoped to this Sales Executive
    const deliveries = await this.prisma.deliveries.findMany({
      where: {
        OR: [
          { delivered_by: empId },
          { sales: { employee_id: empId } },
        ],
      },
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
      orderBy: { delivery_id: 'desc' },
    });

    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter(
      (d) => d.customer_received || (d.delivery_status || '').toLowerCase() === 'delivered',
    ).length;
    const pendingDeliveries = totalDeliveries - completedDeliveries;
    const deliveryFulfillmentRate = totalDeliveries > 0 ? Number(((completedDeliveries / totalDeliveries) * 100).toFixed(1)) : 100;

    // Actionable Deliveries (Pending Handover / Odometer Check / Customer Confirmation)
    const actionableDeliveries = deliveries
      .filter((d) => !d.customer_received && (d.delivery_status || '').toLowerCase() !== 'delivered')
      .map((d) => ({
        delivery_id: d.delivery_id,
        sale_id: d.sale_id,
        customer_name: `${d.sales?.customers?.first_name || ''} ${d.sales?.customers?.last_name || ''}`.trim() || 'Customer',
        customer_phone: d.sales?.customers?.phone || 'N/A',
        vehicle_name: `${d.sales?.vehicles?.make || ''} ${d.sales?.vehicles?.model || ''} (${d.sales?.vehicles?.manufacture_year || ''})`.trim(),
        branch_name: d.sales?.branches?.branch_name || employee.branches?.branch_name || 'CarRevive',
        delivery_date: d.delivery_date || d.created_at,
        delivery_status: d.delivery_status || 'Pending',
        odometer_reading: d.odometer_reading,
        delivery_notes: d.delivery_notes,
        customer_received: Boolean(d.customer_received),
        loan_amount: Number(d.sales?.loan_amount || 0),
        final_amount: Number(d.sales?.final_amount || 0),
      }));

    return {
      executive: {
        employee_id: employee.employee_id,
        name: `${employee.first_name} ${employee.last_name || ''}`.trim(),
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        job_title: employee.job_title || 'Sales Executive',
        branch_id: employee.branch_id,
        branch_name: employee.branches?.branch_name || 'CarRevive Branch',
      },
      kpis: {
        totalLeads,
        activeLeads,
        convertedLeads,
        lostLeads,
        conversionRate,
        totalClosedDeals,
        totalClosedRevenue,
        averageDealValue,
        totalDeliveries,
        pendingDeliveries,
        completedDeliveries,
        deliveryFulfillmentRate,
      },
      pipelineFunnel,
      leadSources,
      monthlyTrend,
      actionableDeliveries,
      priorityLeads,
    };
  }
}
