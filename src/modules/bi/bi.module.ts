import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BiController } from './bi.controller';
import { BiService } from './bi.service';
import { ProcurementBiService } from '../analytics/procurement-bi.service';

@Module({
  imports: [PrismaModule],
  controllers: [BiController],
  providers: [BiService, ProcurementBiService],
  exports: [BiService, ProcurementBiService],
})
export class BiModule {}
