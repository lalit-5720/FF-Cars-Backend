"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const role_enum_1 = require("../../common/enums/role.enum");
const bcrypt = __importStar(require("bcrypt"));
let AuthService = class AuthService {
    prisma;
    jwtService;
    configService;
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        const jwtSecret = this.configService.get('JWT_SECRET');
        if (!jwtSecret) {
            throw new Error('JWT_SECRET environment variable is not set');
        }
        const jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET');
        if (!jwtRefreshSecret) {
            throw new Error('JWT_REFRESH_SECRET environment variable is not set');
        }
    }
    async register(registerDto) {
        const lowerEmail = (registerDto.email || '').toLowerCase().trim();
        const names = registerDto.name.trim().split(' ');
        const firstName = names[0];
        const lastName = names.slice(1).join(' ') || '';
        const existing = await this.prisma.customers.findFirst({
            where: { email: { equals: lowerEmail, mode: 'insensitive' } },
        });
        if (existing) {
            throw new common_1.UnauthorizedException('An account with this email address already exists.');
        }
        const plainPassword = registerDto.password;
        if (!plainPassword) {
            throw new common_1.UnauthorizedException('Password is required.');
        }
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        const customer = await this.prisma.customers.create({
            data: {
                first_name: firstName,
                last_name: lastName,
                email: registerDto.email,
                password: hashedPassword,
                phone: registerDto.phone || null,
                preferred_contact: 'Email',
            },
        });
        const tokens = await this.generateTokens(customer.customer_id, customer.email || '', role_enum_1.Role.CUSTOMER, null);
        return {
            ...tokens,
            user: {
                id: customer.customer_id,
                name: `${customer.first_name} ${customer.last_name || ''}`.trim(),
                email: customer.email,
                role: role_enum_1.Role.CUSTOMER,
                branch_id: null,
            },
        };
    }
    async login(loginDto) {
        const lowerEmail = (loginDto.email || '').toLowerCase().trim();
        const inputPassword = loginDto.password || '';
        const employee = await this.prisma.employees.findFirst({
            where: { email: { equals: lowerEmail, mode: 'insensitive' } },
            include: { branches: true },
        });
        if (employee) {
            if (!employee.password) {
                throw new common_1.UnauthorizedException('Invalid email or password.');
            }
            const isMatch = await bcrypt.compare(inputPassword, employee.password);
            if (!isMatch) {
                throw new common_1.UnauthorizedException('Invalid email or password.');
            }
            const userRole = employee.role;
            const branchId = userRole === role_enum_1.Role.SYSTEM_ADMIN ? null : (employee.branch_id || 1);
            const tokens = await this.generateTokens(employee.employee_id, employee.email || '', userRole, branchId);
            return {
                ...tokens,
                user: {
                    id: employee.employee_id,
                    name: `${employee.first_name} ${employee.last_name || ''}`.trim(),
                    email: employee.email,
                    role: userRole,
                    job_title: employee.job_title || userRole,
                    branch_id: branchId,
                },
            };
        }
        const customer = await this.prisma.customers.findFirst({
            where: { email: { equals: lowerEmail, mode: 'insensitive' } },
        });
        if (customer) {
            if (!customer.password) {
                throw new common_1.UnauthorizedException('Invalid email or password.');
            }
            const isMatch = await bcrypt.compare(inputPassword, customer.password);
            if (!isMatch) {
                throw new common_1.UnauthorizedException('Invalid email or password.');
            }
            const tokens = await this.generateTokens(customer.customer_id, customer.email || '', role_enum_1.Role.CUSTOMER, null);
            return {
                ...tokens,
                user: {
                    id: customer.customer_id,
                    name: `${customer.first_name} ${customer.last_name || ''}`.trim(),
                    email: customer.email,
                    role: role_enum_1.Role.CUSTOMER,
                    branch_id: null,
                },
            };
        }
        throw new common_1.UnauthorizedException('Invalid email or password.');
    }
    async refreshTokens(userId, email, role, branchId = null) {
        return this.generateTokens(userId, email, role, branchId);
    }
    async generateTokens(id, email, role, branchId = null) {
        const payload = { sub: id, email, role, branch_id: branchId };
        const jwtSecret = this.configService.get('JWT_SECRET');
        if (!jwtSecret) {
            throw new Error('JWT_SECRET environment variable is not set');
        }
        const jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET');
        if (!jwtRefreshSecret) {
            throw new Error('JWT_REFRESH_SECRET environment variable is not set');
        }
        const accessToken = await this.jwtService.signAsync(payload, {
            secret: jwtSecret,
            expiresIn: this.configService.get('JWT_ACCESS_EXPIRY') || '15m',
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: jwtRefreshSecret,
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRY') || '7d',
        });
        return {
            accessToken,
            refreshToken,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map