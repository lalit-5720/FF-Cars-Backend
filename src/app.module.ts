import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { CustomersModule } from './modules/customers/customers.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { LeadsModule } from './modules/leads/leads.module';
import { TestDrivesModule } from './modules/test-drives/test-drives.module';
import { SalesModule } from './modules/sales/sales.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { UploadModule } from './modules/upload/upload.module';
import { CacheModule } from './common/services/cache.module';

@Module({
  imports: [
    // Global Config env variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),

    // Global Services
    PrismaModule,
    CacheModule,

    // Domain Modules matching 9-Table Schema
    AuthModule,
    BranchesModule,
    VehiclesModule,
    CustomersModule,
    EmployeesModule,
    LeadsModule,
    TestDrivesModule,
    SalesModule,
    PaymentsModule,
    DeliveriesModule,
    UploadModule,
  ],
})
export class AppModule {}
