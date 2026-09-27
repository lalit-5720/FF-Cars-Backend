import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { BiModule } from '../bi/bi.module';
import { DecisionScoreService } from './decision-score.service';
import { ProcurementBiService } from './procurement-bi.service';
import { LiveMarketService } from './live-market.service';
import { SalesExecutiveAnalyticsService } from './sales-executive-analytics.service';

@Module({
  imports: [BiModule],
  controllers: [AnalyticsController],
  providers: [DecisionScoreService, ProcurementBiService, LiveMarketService, SalesExecutiveAnalyticsService],
  exports: [DecisionScoreService, ProcurementBiService, LiveMarketService, SalesExecutiveAnalyticsService],
})
export class AnalyticsModule {}


