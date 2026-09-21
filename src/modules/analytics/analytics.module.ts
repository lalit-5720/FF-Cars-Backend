import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { BiModule } from '../bi/bi.module';
import { DecisionScoreService } from './decision-score.service';
import { ProcurementBiService } from './procurement-bi.service';
import { LiveMarketService } from './live-market.service';

@Module({
  imports: [BiModule],
  controllers: [AnalyticsController],
  providers: [DecisionScoreService, ProcurementBiService, LiveMarketService],
  exports: [DecisionScoreService, ProcurementBiService, LiveMarketService],
})
export class AnalyticsModule {}


