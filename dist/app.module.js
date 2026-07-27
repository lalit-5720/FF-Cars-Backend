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
const branches_module_1 = require("./modules/branches/branches.module");
const vehicles_module_1 = require("./modules/vehicles/vehicles.module");
const customers_module_1 = require("./modules/customers/customers.module");
const employees_module_1 = require("./modules/employees/employees.module");
const leads_module_1 = require("./modules/leads/leads.module");
const test_drives_module_1 = require("./modules/test-drives/test-drives.module");
const sales_module_1 = require("./modules/sales/sales.module");
const payments_module_1 = require("./modules/payments/payments.module");
const deliveries_module_1 = require("./modules/deliveries/deliveries.module");
const upload_module_1 = require("./modules/upload/upload.module");
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
            branches_module_1.BranchesModule,
            vehicles_module_1.VehiclesModule,
            customers_module_1.CustomersModule,
            employees_module_1.EmployeesModule,
            leads_module_1.LeadsModule,
            test_drives_module_1.TestDrivesModule,
            sales_module_1.SalesModule,
            payments_module_1.PaymentsModule,
            deliveries_module_1.DeliveriesModule,
            upload_module_1.UploadModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map