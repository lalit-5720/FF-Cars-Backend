import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BiController } from './bi.controller';
import { BiService } from './bi.service';
import { ProcurementBiService } from '../analytics/procurement-bi.service';
import { DecisionScoreService } from '../analytics/decision-score.service';

@Module({
  imports: [PrismaModule],
  controllers: [BiController],
  providers: [BiService, DecisionScoreService, ProcurementBiService],
  exports: [BiService, DecisionScoreService, ProcurementBiService],
})
export class BiModule {}
