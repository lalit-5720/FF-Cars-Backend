"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const cars_module_1 = require("./modules/cars/cars.module");
const bookings_module_1 = require("./modules/bookings/bookings.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const wishlist_module_1 = require("./modules/wishlist/wishlist.module");
const upload_module_1 = require("./modules/upload/upload.module");
const admin_module_1 = require("./modules/admin/admin.module");
const cache_module_1 = require("./common/services/cache.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env'],
            }),
            prisma_module_1.PrismaModule,
            cache_module_1.CacheModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            cars_module_1.CarsModule,
            bookings_module_1.BookingsModule,
            notifications_module_1.NotificationsModule,
            wishlist_module_1.WishlistModule,
            upload_module_1.UploadModule,
            admin_module_1.AdminModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map