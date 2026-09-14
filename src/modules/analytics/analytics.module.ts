import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { BiModule } from '../bi/bi.module';
import { DecisionScoreService } from './decision-score.service';
import { ProcurementBiService } from './procurement-bi.service';

@Module({
  imports: [BiModule],
  controllers: [AnalyticsController],
  providers: [DecisionScoreService, ProcurementBiService],
  exports: [DecisionScoreService, ProcurementBiService],
})
export class AnalyticsModule {}

