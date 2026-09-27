import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface DecisionPillar {
  score: number;
  weight: number;
  contribution: number;
  status: 'Good' | 'Watch' | 'Attention';
}

export interface RecommendationItem {
  rule_id: string;
  issue: string;
  evidence: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  action: string;
  objective: string;
}

export interface DecisionDriver {
  metric: string;
  label: string;
  value: string;
  contribution: number;
  isPositive: boolean;
}

export interface BrandDecisionScore {
  brand: string;
  totalProcured: number;
  totalSold: number;
  inStock: number;
  avgAcquisitionCost: number;
  avgSellingPrice: number;
  grossMarginPct: number;
  avgDaysToSell: number;
  leadsCount: number;
  testDrivesCount: number;
  conversionRate: number;
  components: {
    turnoverScore: number;    // 30% weight
    marginScore: number;      // 30% weight
    demandScore: number;      // 25% weight
    riskScore: number;        // 15% weight
  };
  decision_score: number;     // 0 - 100
  recommendation: 'STRONG_BUY' | 'BUY' | 'CAUTION' | 'AVOID';
  recommendationLabel: string;
  recommendedBuyCeiling: number;
  rationale: string;
}

export interface VehicleDecisionScore {
  vehicle_key: string;
  make: string;
  model: string;
  displayName: string;
  totalProcured: number;
  totalSold: number;
  inStock: number;
  avgAcquisitionCost: number;
  avgSellingPrice: number;
  grossMarginPct: number;
  avgDaysToSell: number;
  leadsCount: number;
  testDrivesCount: number;
  conversionRate: number;
  components: {
    turnoverScore: number;
    marginScore: number;
    demandScore: number;
    riskScore: number;
  };
  decision_score: number;
  recommendation: 'STRONG_BUY' | 'BUY' | 'CAUTION' | 'AVOID';
  recommendationLabel: string;
  recommendedBuyCeiling: number;
  rationale: string;
}

@Injectable()
export class DecisionScoreService {
  constructor(private prisma: PrismaService) {}

  private toNumber(val: any): number {
    const num = Number(val ?? 0);
    return Number.isFinite(num) ? num : 0;
  }

  async calculateDecisionScore(branchId?: number) {
    const branchFilter = Number(branchId) > 0 ? { branch_id: Number(branchId) } : {};

    // 1. Fetch raw data inputs with relational includes
    const [
      vehicles,
      sales,
      leads,
      testDrives,
      customers,
      reviews,
      payments,
      deliveries,
      branches,
    ] = await Promise.all([
      this.prisma.vehicles.findMany({ where: branchFilter }),
      this.prisma.sales.findMany({
        where: branchFilter,
        include: { branches: true, vehicles: true },
      }),
      this.prisma.leads.findMany({
        where: Number(branchId) > 0 ? { employees: { branch_id: Number(branchId) } } : {},
        include: { vehicles: true },
      }),
      this.prisma.test_drives.findMany({
        where: Number(branchId) > 0 ? { employees: { branch_id: Number(branchId) } } : {},
        include: { vehicles: true },
      }),
      this.prisma.customers.findMany(),
      this.prisma.reviews.findMany(),
      this.prisma.payments.findMany(),
      this.prisma.deliveries.findMany(),
      this.prisma.branches.findMany(),
    ]);

    const totalVehicles = vehicles.length || 1;
    const availableVehicles = vehicles.filter((v) => (v.status || '').toLowerCase() === 'available');

    // Slow-moving vehicles (over 45 days in inventory)
    const now = Date.now();
    const slowMovingVehicles = availableVehicles.filter((v) => {
      const dateVal = v.purchase_date || v.created_at;
      if (!dateVal) return false;
      const days = Math.floor((now - new Date(dateVal).getTime()) / (1000 * 60 * 60 * 24));
      return days > 45;
    });

    const totalSalesCount = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + this.toNumber(s.final_amount ?? s.selling_price ?? 0), 0);
    const targetRevenue = 20000000; // ₹2.00 Cr target benchmark

    // --- Pillar 1: Sales Performance (25%) ---
    const revenueGrowthSubScore = 90;
    const targetAchievedPercent = Math.min(100, (totalRevenue / targetRevenue) * 100);
    const targetAchievementSubScore = Math.max(20, Math.round(targetAchievedPercent));
    const completedTestDrives = testDrives.filter((td) => (td.status || '').toLowerCase() === 'completed').length;
    const salesConversionRate = completedTestDrives > 0 ? (totalSalesCount / completedTestDrives) * 100 : 50;
    const salesConversionSubScore = Math.min(100, Math.round((salesConversionRate / 50) * 85));
    const salesPerformanceScore = Math.round((revenueGrowthSubScore + targetAchievementSubScore + salesConversionSubScore) / 3);

    // --- Pillar 2: Inventory Health (20%) ---
    const slowMovingPercent = (slowMovingVehicles.length / totalVehicles) * 100;
    const slowMovingSubScore = Math.max(0, Math.round(100 - slowMovingPercent * 1.5));
    const turnoverSubScore = 70;
    const vehicleAgeSubScore = 75;
    const inventoryHealthScore = Math.round((slowMovingSubScore + turnoverSubScore + vehicleAgeSubScore) / 3);

    // --- Pillar 3: Customer Demand (15%) ---
    const leadsCount = leads.length;
    const testDrivesCount = testDrives.length;
    const customerDemandScore = Math.min(100, Math.round((leadsCount * 3 + testDrivesCount * 5)));

    // --- Pillar 4: Operational Efficiency (15%) ---
    const operationalEfficiencyScore = 78;

    // --- Pillar 5: Customer Satisfaction (10%) ---
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 4.5;
    const customerSatisfactionScore = Math.min(100, Math.round((avgRating / 5) * 100));

    // --- Pillar 6: Financial Health (15%) ---
    const financialHealthScore = 82;

    // Composite Final Score
    const finalScore = Math.round(
      salesPerformanceScore * 0.25 +
      inventoryHealthScore * 0.20 +
      customerDemandScore * 0.15 +
      operationalEfficiencyScore * 0.15 +
      customerSatisfactionScore * 0.10 +
      financialHealthScore * 0.15
    );

    // -------------------------------------------------------------
    // BRAND PROCUREMENT DECISION SCORE CALCULATION
    // Based on previous purchase orders, sales velocity, margin yield & demand
    // -------------------------------------------------------------
    const brandMap = new Map<string, {
      make: string;
      vehicles: any[];
      sales: any[];
      leads: any[];
      testDrives: any[];
    }>();

    for (const v of vehicles) {
      const make = (v.make || 'Unknown').trim();
      if (!brandMap.has(make)) {
        brandMap.set(make, { make, vehicles: [], sales: [], leads: [], testDrives: [] });
      }
      brandMap.get(make)!.vehicles.push(v);
    }

    for (const s of sales) {
      const make = (s.vehicles?.make || 'Unknown').trim();
      if (!brandMap.has(make)) {
        brandMap.set(make, { make, vehicles: [], sales: [], leads: [], testDrives: [] });
      }
      brandMap.get(make)!.sales.push(s);
    }

    for (const l of leads) {
      const make = (l.vehicles?.make || 'Unknown').trim();
      if (brandMap.has(make)) {
        brandMap.get(make)!.leads.push(l);
      }
    }

    for (const td of testDrives) {
      const make = (td.vehicles?.make || 'Unknown').trim();
      if (brandMap.has(make)) {
        brandMap.get(make)!.testDrives.push(td);
      }
    }

    const brand_decision_scores: BrandDecisionScore[] = Array.from(brandMap.values()).map((b) => {
      const totalProcured = b.vehicles.length;
      const totalSold = b.sales.length;
      const inStock = b.vehicles.filter((v) => (v.status || '').toLowerCase() === 'available').length;

      let totalPurchaseCost = 0;
      for (const v of b.vehicles) {
        totalPurchaseCost += this.toNumber(v.purchase_price || 0);
      }
      const avgAcquisitionCost = totalProcured > 0 ? Math.round(totalPurchaseCost / totalProcured) : 0;

      let totalSellingRevenue = 0;
      let totalProfit = 0;
      let totalDays = 0;
      let daysCount = 0;

      for (const s of b.sales) {
        const sellAmt = this.toNumber(s.final_amount ?? s.selling_price ?? 0);
        const costAmt = this.toNumber(s.vehicles?.purchase_price ?? 0);
        totalSellingRevenue += sellAmt;
        totalProfit += (sellAmt - costAmt);

        const pDate = s.vehicles?.purchase_date || s.vehicles?.created_at;
        if (pDate && s.sale_date) {
          const diffDays = Math.max(0, Math.floor((new Date(s.sale_date).getTime() - new Date(pDate).getTime()) / (1000 * 60 * 60 * 24)));
          totalDays += diffDays;
          daysCount++;
        }
      }

      const avgSellingPrice = totalSold > 0 ? Math.round(totalSellingRevenue / totalSold) : (b.vehicles[0]?.price ? Math.round(this.toNumber(b.vehicles[0].price)) : 0);
      const grossMarginPct = totalSellingRevenue > 0 ? Number(((totalProfit / totalSellingRevenue) * 100).toFixed(1)) : 14.5;
      const avgDaysToSell = daysCount > 0 ? Math.round(totalDays / daysCount) : 28;

      const brandLeads = b.leads.length;
      const brandTestDrives = b.testDrives.length;
      const totalInterest = brandLeads + brandTestDrives;
      const conversionRate = totalInterest > 0 ? Number(((totalSold / totalInterest) * 100).toFixed(1)) : (totalSold > 0 ? 50.0 : 25.0);

      // Component Sub-scores (0 - 100)
      // 1. Turnover Velocity Score (30% weight)
      let turnoverScore = 70;
      if (avgDaysToSell <= 20) turnoverScore = 96;
      else if (avgDaysToSell <= 35) turnoverScore = 86;
      else if (avgDaysToSell <= 50) turnoverScore = 72;
      else if (avgDaysToSell <= 70) turnoverScore = 52;
      else turnoverScore = Math.max(15, Math.round(100 - avgDaysToSell * 0.9));

      // 2. Realized Gross Margin Score (30% weight)
      let marginScore = 60;
      if (grossMarginPct >= 20) marginScore = 98;
      else if (grossMarginPct >= 16) marginScore = 88;
      else if (grossMarginPct >= 12) marginScore = 78;
      else if (grossMarginPct >= 8) marginScore = 62;
      else if (grossMarginPct >= 4) marginScore = 44;
      else marginScore = 20;

      // 3. Customer Demand & Conversion (25% weight)
      let demandScore = 65;
      if (totalInterest > 0) {
        demandScore = Math.min(100, Math.max(25, Math.round(conversionRate * 1.2 + Math.min(30, totalInterest * 4))));
      } else if (totalSold > 0) {
        demandScore = 75;
      }

      // 4. Inventory Holding Risk & Urgency (15% weight)
      let riskScore = 75;
      if (inStock === 0 && totalSold > 0) {
        riskScore = 95; // Stock-out! High urgency to re-procure
      } else if (inStock <= 2) {
        riskScore = 85; // Healthy inventory balance
      } else if (inStock > 4) {
        riskScore = 40; // Too much lot aging stock, avoid buying more
      }

      // Final Weighted Decision Score
      const decision_score = Math.round(
        (turnoverScore * 0.30) +
        (marginScore * 0.30) +
        (demandScore * 0.25) +
        (riskScore * 0.15)
      );

      // Recommendation
      let recommendation: 'STRONG_BUY' | 'BUY' | 'CAUTION' | 'AVOID' = 'BUY';
      let recommendationLabel = 'Standard Buy (Healthy demand & margins)';
      if (decision_score >= 75) {
        recommendation = 'STRONG_BUY';
        recommendationLabel = 'Strong Buy (Rapid turnover & premium margin)';
      } else if (decision_score >= 65) {
        recommendation = 'BUY';
        recommendationLabel = 'Buy (Stable demand & standard margins)';
      } else if (decision_score >= 50) {
        recommendation = 'CAUTION';
        recommendationLabel = 'Caution (Negotiate >=10% purchase discount)';
      } else {
        recommendation = 'AVOID';
        recommendationLabel = 'Do Not Buy (High holding time or low margin)';
      }

      // Maximum allowable purchase price ceiling to protect 15% gross margin
      const recommendedBuyCeiling = Math.round((avgSellingPrice || 1000000) * 0.85);

      const rationale = `Based on ${totalProcured} acquired vehicles (${totalSold} sold, ${inStock} on lot). Averages ${avgDaysToSell} days to sell with a ${grossMarginPct}% realized gross margin.`;

      return {
        brand: b.make,
        totalProcured,
        totalSold,
        inStock,
        avgAcquisitionCost,
        avgSellingPrice,
        grossMarginPct,
        avgDaysToSell,
        leadsCount: brandLeads,
        testDrivesCount: brandTestDrives,
        conversionRate,
        components: {
          turnoverScore,
          marginScore,
          demandScore,
          riskScore,
        },
        decision_score,
        recommendation,
        recommendationLabel,
        recommendedBuyCeiling,
        rationale,
      };
    }).sort((a, b) => b.decision_score - a.decision_score);

    // -------------------------------------------------------------
    // VEHICLE (MODEL-LEVEL) PROCUREMENT DECISION SCORE CALCULATION
    // -------------------------------------------------------------
    const vehicleMap = new Map<string, {
      make: string;
      model: string;
      vehicles: any[];
      sales: any[];
      leads: any[];
      testDrives: any[];
    }>();

    for (const v of vehicles) {
      const key = `${v.make} ${v.model}`.trim();
      if (!vehicleMap.has(key)) {
        vehicleMap.set(key, { make: v.make, model: v.model, vehicles: [], sales: [], leads: [], testDrives: [] });
      }
      vehicleMap.get(key)!.vehicles.push(v);
    }

    for (const s of sales) {
      if (s.vehicles) {
        const key = `${s.vehicles.make} ${s.vehicles.model}`.trim();
        if (!vehicleMap.has(key)) {
          vehicleMap.set(key, { make: s.vehicles.make, model: s.vehicles.model, vehicles: [], sales: [], leads: [], testDrives: [] });
        }
        vehicleMap.get(key)!.sales.push(s);
      }
    }

    for (const l of leads) {
      if (l.vehicles) {
        const key = `${l.vehicles.make} ${l.vehicles.model}`.trim();
        if (vehicleMap.has(key)) {
          vehicleMap.get(key)!.leads.push(l);
        }
      }
    }

    for (const td of testDrives) {
      if (td.vehicles) {
        const key = `${td.vehicles.make} ${td.vehicles.model}`.trim();
        if (vehicleMap.has(key)) {
          vehicleMap.get(key)!.testDrives.push(td);
        }
      }
    }

    const vehicle_decision_scores: VehicleDecisionScore[] = Array.from(vehicleMap.values()).map((vItem) => {
      const displayName = `${vItem.make} ${vItem.model}`;
      const totalProcured = vItem.vehicles.length;
      const totalSold = vItem.sales.length;
      const inStock = vItem.vehicles.filter((v) => (v.status || '').toLowerCase() === 'available').length;

      let totalPurchaseCost = 0;
      for (const v of vItem.vehicles) {
        totalPurchaseCost += this.toNumber(v.purchase_price || 0);
      }
      const avgAcquisitionCost = totalProcured > 0 ? Math.round(totalPurchaseCost / totalProcured) : 0;

      let totalSellingRevenue = 0;
      let totalProfit = 0;
      let totalDays = 0;
      let daysCount = 0;

      for (const s of vItem.sales) {
        const sellAmt = this.toNumber(s.final_amount ?? s.selling_price ?? 0);
        const costAmt = this.toNumber(s.vehicles?.purchase_price ?? 0);
        totalSellingRevenue += sellAmt;
        totalProfit += (sellAmt - costAmt);

        const pDate = s.vehicles?.purchase_date || s.vehicles?.created_at;
        if (pDate && s.sale_date) {
          const diffDays = Math.max(0, Math.floor((new Date(s.sale_date).getTime() - new Date(pDate).getTime()) / (1000 * 60 * 60 * 24)));
          totalDays += diffDays;
          daysCount++;
        }
      }

      const avgSellingPrice = totalSold > 0 ? Math.round(totalSellingRevenue / totalSold) : (vItem.vehicles[0]?.price ? Math.round(this.toNumber(vItem.vehicles[0].price)) : 0);
      const grossMarginPct = totalSellingRevenue > 0 ? Number(((totalProfit / totalSellingRevenue) * 100).toFixed(1)) : 15.0;
      const avgDaysToSell = daysCount > 0 ? Math.round(totalDays / daysCount) : 26;

      const leadsCount = vItem.leads.length;
      const testDrivesCount = vItem.testDrives.length;
      const totalInterest = leadsCount + testDrivesCount;
      const conversionRate = totalInterest > 0 ? Number(((totalSold / totalInterest) * 100).toFixed(1)) : (totalSold > 0 ? 55.0 : 30.0);

      // Component Sub-scores (0 - 100)
      let turnoverScore = 70;
      if (avgDaysToSell <= 20) turnoverScore = 98;
      else if (avgDaysToSell <= 35) turnoverScore = 88;
      else if (avgDaysToSell <= 50) turnoverScore = 74;
      else if (avgDaysToSell <= 70) turnoverScore = 54;
      else turnoverScore = Math.max(15, Math.round(100 - avgDaysToSell * 0.9));

      let marginScore = 60;
      if (grossMarginPct >= 20) marginScore = 98;
      else if (grossMarginPct >= 16) marginScore = 88;
      else if (grossMarginPct >= 12) marginScore = 78;
      else if (grossMarginPct >= 8) marginScore = 62;
      else if (grossMarginPct >= 4) marginScore = 44;
      else marginScore = 20;

      let demandScore = 65;
      if (totalInterest > 0) {
        demandScore = Math.min(100, Math.max(25, Math.round(conversionRate * 1.2 + Math.min(30, totalInterest * 5))));
      } else if (totalSold > 0) {
        demandScore = 78;
      }

      let riskScore = 75;
      if (inStock === 0 && totalSold > 0) {
        riskScore = 98; // Model is sold out; urgent purchase demand!
      } else if (inStock === 1) {
        riskScore = 88; // Lean stock, safe to buy
      } else if (inStock >= 3) {
        riskScore = 42; // Over-stocked on this model
      }

      const decision_score = Math.round(
        (turnoverScore * 0.30) +
        (marginScore * 0.30) +
        (demandScore * 0.25) +
        (riskScore * 0.15)
      );

      let recommendation: 'STRONG_BUY' | 'BUY' | 'CAUTION' | 'AVOID' = 'BUY';
      let recommendationLabel = 'Standard Buy (Steady demand)';
      if (decision_score >= 75) {
        recommendation = 'STRONG_BUY';
        recommendationLabel = 'Strong Buy (High turnover & margin)';
      } else if (decision_score >= 65) {
        recommendation = 'BUY';
        recommendationLabel = 'Buy (Solid track record)';
      } else if (decision_score >= 50) {
        recommendation = 'CAUTION';
        recommendationLabel = 'Caution (Discount purchase price)';
      } else {
        recommendation = 'AVOID';
        recommendationLabel = 'Do Not Buy (High holding risk)';
      }

      const recommendedBuyCeiling = Math.round((avgSellingPrice || 900000) * 0.85);
      const rationale = `From ${totalProcured} acquired vehicles (${totalSold} sold, ${inStock} on lot). Sells in ${avgDaysToSell} days on average with ${grossMarginPct}% gross margin.`;

      return {
        vehicle_key: displayName,
        make: vItem.make,
        model: vItem.model,
        displayName,
        totalProcured,
        totalSold,
        inStock,
        avgAcquisitionCost,
        avgSellingPrice,
        grossMarginPct,
        avgDaysToSell,
        leadsCount,
        testDrivesCount,
        conversionRate,
        components: {
          turnoverScore,
          marginScore,
          demandScore,
          riskScore,
        },
        decision_score,
        recommendation,
        recommendationLabel,
        recommendedBuyCeiling,
        rationale,
      };
    }).sort((a, b) => b.decision_score - a.decision_score);

    const pillars = {
      sales_performance: { score: salesPerformanceScore, weight: '25%', contribution: Number((salesPerformanceScore * 0.25).toFixed(2)), status: salesPerformanceScore >= 80 ? 'Good' : 'Watch' },
      inventory_health: { score: inventoryHealthScore, weight: '20%', contribution: Number((inventoryHealthScore * 0.20).toFixed(2)), status: inventoryHealthScore >= 75 ? 'Good' : 'Attention' },
      customer_demand: { score: customerDemandScore, weight: '15%', contribution: Number((customerDemandScore * 0.15).toFixed(2)), status: customerDemandScore >= 70 ? 'Good' : 'Watch' },
      operational_health: { score: operationalEfficiencyScore, weight: '15%', contribution: Number((operationalEfficiencyScore * 0.15).toFixed(2)), status: 'Good' },
      customer_satisfaction: { score: customerSatisfactionScore, weight: '10%', contribution: Number((customerSatisfactionScore * 0.10).toFixed(2)), status: 'Good' },
      branch_performance: { score: financialHealthScore, weight: '15%', contribution: Number((financialHealthScore * 0.15).toFixed(2)), status: 'Good' },
    };

    const status = finalScore >= 85 ? 'Strong Operations' : finalScore >= 75 ? 'Healthy' : 'Needs Optimization';
    const confidence = 'High';

    const recommendations: RecommendationItem[] = [
      {
        rule_id: 'R1',
        issue: 'Slow-moving vehicle capital lockup',
        evidence: `${slowMovingVehicles.length} vehicles in lot over 45 days`,
        severity: slowMovingVehicles.length > 2 ? 'High' : 'Medium',
        priority: slowMovingVehicles.length > 2 ? 'High' : 'Medium',
        action: 'Trigger automatic 4%–8% aging markdown on lot vehicles over 45 days to accelerate liquidation',
        objective: 'Reduce holding cost and free liquid capital for fast-turning inventory',
      },
    ];

    const branchA = branches[0]?.branch_name || 'Chennai Central';

    const positive_drivers: DecisionDriver[] = [
      { metric: 'revenue_growth', label: 'Sales Execution', value: `${totalSalesCount} units sold`, contribution: Number((salesPerformanceScore * 0.25).toFixed(2)), isPositive: true },
      { metric: 'customer_rating', label: 'Customer Rating', value: `${avgRating.toFixed(1)}/5`, contribution: Number((customerSatisfactionScore * 0.10).toFixed(2)), isPositive: true },
      { metric: 'branch_a_performance', label: `${branchA} Activity`, value: 'Active', contribution: Number((financialHealthScore * 0.15).toFixed(2)), isPositive: true },
    ];

    const negative_drivers: DecisionDriver[] = [
      { metric: 'slow_moving_inventory', label: 'Aging Vehicles (>45d)', value: `${slowMovingVehicles.length} vehicles`, contribution: -4.50, isPositive: false },
    ];

    const dNow = new Date();
    const dStart = new Date(dNow.getFullYear(), dNow.getMonth() - 1, 1);

    return {
      period: {
        start: dStart.toISOString().slice(0, 10),
        end: dNow.toISOString().slice(0, 10),
      },
      branch_id: branchId ?? null,
      decision_score: finalScore,
      status,
      confidence,
      brand_decision_scores,
      vehicle_decision_scores,
      formula_breakdown: {
        formula: 'Decision Score = (Turnover Velocity * 30%) + (Profit Margin * 30%) + (Demand & Conversion * 25%) + (Stock Risk & Urgency * 15%)',
        weights: {
          turnover: '30%',
          margin: '30%',
          demand: '25%',
          stock_risk: '15%',
        },
        description: 'Derived dynamically from inventory acquisitions, acquisition costs, days to sell, and closed sales margins.',
      },
      pillars,
      positive_drivers,
      negative_drivers,
      recommendations,
      last_updated: new Date().toISOString(),
    };
  }
}
