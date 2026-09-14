import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';
import { BiQueryDto } from '../bi/bi.dto';
import { BiService } from '../bi/bi.service';
import { DecisionScoreService } from './decision-score.service';
import { ProcurementBiService } from './procurement-bi.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
export class AnalyticsController {
  constructor(
    private readonly biService: BiService,
    private readonly decisionScoreService: DecisionScoreService,
    private readonly procurementBiService: ProcurementBiService,
  ) {}

  @Get('procurement-intelligence')
  getProcurementIntelligence(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    return this.procurementBiService.getProcurementIntelligence(effectiveBranchId);
  }

  // Feature 1: Purchase Orders
  @Get('purchase-orders')
  getPurchaseOrders(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    return this.procurementBiService.getPurchaseOrders(effectiveBranchId);
  }

  @Post('purchase-orders')
  createPurchaseOrder(@Body() body: any) {
    return this.procurementBiService.createPurchaseOrder(body);
  }

  @Patch('purchase-orders/:id/status')
  updatePurchaseOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.procurementBiService.updatePurchaseOrderStatus(Number(id), status);
  }

  // Feature 2: AI Dynamic Repricing
  @Get('repricing-suggestions')
  getRepricingSuggestions(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    return this.procurementBiService.getDynamicRepricingSuggestions(effectiveBranchId);
  }

  @Post('apply-repricing')
  applyRepricing(@Body() body: { vehicleId: number; newPrice: number }) {
    return this.procurementBiService.applyVehicleRepricing(body.vehicleId, body.newPrice);
  }

  // Feature 3: Smart Inter-Branch Stock Reallocation
  @Get('reallocation-suggestions')
  getReallocationSuggestions() {
    return this.procurementBiService.getBranchReallocationSuggestions();
  }

  @Post('transfer-vehicle')
  transferVehicle(@Body() body: { vehicleId: number; targetBranchId: number }) {
    return this.procurementBiService.transferVehicleBranch(body.vehicleId, body.targetBranchId);
  }

  // Feature 4: Branch Demand & 5 Customer Evidence Report for Faculty
  @Get('branch-evidence-report')
  getBranchEvidenceReport(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    return this.procurementBiService.getBranchEvidenceReport(effectiveBranchId);
  }

  // Feature 5: Vehicle Demand Analytics & Buy Suggestions
  @Get('vehicle-demand')
  getVehicleDemand(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    return this.procurementBiService.getVehicleDemand(effectiveBranchId);
  }

  // Feature 6: Dynamic Operational Alerts (No Static Mock Data)
  @Get('dynamic-alerts')
  getDynamicAlerts(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    return this.procurementBiService.getDynamicAlerts(effectiveBranchId);
  }

  // Feature 7: Multi-Branch Performance Analytics
  @Get('branch-performance')
  getBranchPerformance(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    return this.procurementBiService.getBranchPerformance(effectiveBranchId);
  }

  @Get('decision-score')
  getDecisionScore(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    return this.decisionScoreService.calculateDecisionScore(effectiveBranchId);
  }

  @Get('decision-drivers')
  async getDecisionDrivers(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    const fullScore = await this.decisionScoreService.calculateDecisionScore(effectiveBranchId);
    return {
      positive_drivers: fullScore.positive_drivers,
      negative_drivers: fullScore.negative_drivers,
    };
  }

  @Get('recommendations')
  async getRecommendations(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || queryBranch(branchId));
    const fullScore = await this.decisionScoreService.calculateDecisionScore(effectiveBranchId);
    return { recommendations: fullScore.recommendations };
  }

  @Get('overview')
  getOverview(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getOverview({ ...query, branchId: effectiveBranchId });
  }

  @Get('revenue-trend')
  getRevenueTrend(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto, @Query('period') period?: string) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getRevenueTrend({ ...query, branchId: effectiveBranchId }, period);
  }

  @Get('funnel')
  getFunnel(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getFunnel({ ...query, branchId: effectiveBranchId });
  }

  @Get('branch-comparison')
  @Roles(Role.SYSTEM_ADMIN)
  getBranchComparison() {
    return this.biService.getBranchComparison();
  }

  @Get('inventory-health')
  getInventoryHealth(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getInventoryAging({ ...query, branchId: effectiveBranchId });
  }

  @Get('employee-performance')
  getEmployeePerformance(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getEmployeePerformance({ ...query, branchId: effectiveBranchId });
  }

  @Get('payments-health')
  getPaymentsHealth(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getPaymentsHealth({ ...query, branchId: effectiveBranchId });
  }

  @Get('review-sentiment')
  getReviewSentiment() {
    return this.biService.getReviewSentiment();
  }
}

function queryBranch(b?: number) { return b; }

