import { Module } from '@nestjs/common';
import { TestDrivesService } from './test-drives.service';
import { TestDrivesController } from './test-drives.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TestDrivesController],
  providers: [TestDrivesService],
  exports: [TestDrivesService],
})
export class TestDrivesModule {}
