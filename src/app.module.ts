import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CarsModule } from './modules/cars/cars.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { UploadModule } from './modules/upload/upload.module';
import { AdminModule } from './modules/admin/admin.module';
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

    // Domain Modules
    AuthModule,
    UsersModule,
    CarsModule,
    BookingsModule,
    NotificationsModule,
    WishlistModule,
    UploadModule,
    AdminModule,
  ],
})
export class AppModule {}
