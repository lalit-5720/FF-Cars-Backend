import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser, UserPayload } from '../../common/decorators/current-user.decorator';
import { BiQueryDto } from './bi.dto';
import { BiService } from './bi.service';
import { ProcurementBiService } from '../analytics/procurement-bi.service';

@Controller('bi')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN, Role.BRANCH_MANAGER, Role.SALES_EXECUTIVE)
export class BiController {
  constructor(
    private readonly biService: BiService,
    private readonly procurementBiService: ProcurementBiService,
  ) {}

  @Get('branch-evidence-report')
  getBranchEvidenceReport(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    return this.procurementBiService.getBranchEvidenceReport(effectiveBranchId);
  }

  @Get('vehicle-demand')
  getVehicleDemand(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    return this.procurementBiService.getVehicleDemand(effectiveBranchId);
  }

  @Get('dynamic-alerts')
  getDynamicAlerts(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    return this.procurementBiService.getDynamicAlerts(effectiveBranchId);
  }

  @Get('branch-performance')
  getBranchPerformance(@CurrentUser() user: UserPayload, @Query('branchId') branchId?: number) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? branchId : (user.branch_id || branchId);
    return this.procurementBiService.getBranchPerformance(effectiveBranchId);
  }

  @Get('overview')
  getOverview(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getOverview({ ...query, branchId: effectiveBranchId });
  }

  @Get('sales')
  getSalesSummary(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getSalesSummary({ ...query, branchId: effectiveBranchId });
  }

  @Get('inventory')
  getInventorySummary(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getInventorySummary({ ...query, branchId: effectiveBranchId });
  }

  @Get('branches')
  getBranchesSummary(@Query() query: BiQueryDto) {
    return this.biService.getBranchesSummary(query);
  }

  @Get('executive')
  getExecutiveDashboard(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getExecutiveDashboard({ ...query, branchId: effectiveBranchId });
  }

  @Get('revenue-trend')
  getRevenueTrend(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto, @Query('granularity') granularity?: string) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getRevenueTrend({ ...query, branchId: effectiveBranchId }, granularity);
  }

  @Get('top-vehicles')
  getTopVehicles(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto, @Query('limit') limit?: string) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getTopVehicles({ ...query, branchId: effectiveBranchId }, Number(limit));
  }

  @Get('sales-breakdown')
  getSalesBreakdown(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto, @Query('by') by?: string) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getSalesBreakdown({ ...query, branchId: effectiveBranchId }, by);
  }

  @Get('funnel')
  getFunnel(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto) {
    const effectiveBranchId = user.role === Role.SYSTEM_ADMIN ? query.branchId : (user.branch_id || query.branchId);
    return this.biService.getFunnel({ ...query, branchId: effectiveBranchId });
  }

  @Get('inventory-aging')
  @Get('inventory-health')
  getInventoryAging(@CurrentUser() user: UserPayload, @Query() query: BiQueryDto) {
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

  @Get('branch-comparison')
  @Roles(Role.SYSTEM_ADMIN)
  getBranchComparison() {
    return this.biService.getBranchComparison();
  }
}

