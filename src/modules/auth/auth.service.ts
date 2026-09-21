import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is not set');
    }
  }

  async register(registerDto: RegisterDto) {
    const lowerEmail = (registerDto.email || '').toLowerCase().trim();
    const names = registerDto.name.trim().split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || '';

    // Check if customer email already exists
    const existing = await this.prisma.customers.findFirst({
      where: { email: { equals: lowerEmail, mode: 'insensitive' } },
    });
    if (existing) {
      throw new UnauthorizedException('An account with this email address already exists.');
    }

    // Encrypt customer password
    const plainPassword = registerDto.password;
    if (!plainPassword) {
      throw new UnauthorizedException('Password is required.');
    }
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create customer record with encrypted password
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

    const tokens = await this.generateTokens(customer.customer_id, customer.email || '', Role.CUSTOMER, null);
    return {
      ...tokens,
      user: {
        id: customer.customer_id,
        name: `${customer.first_name} ${customer.last_name || ''}`.trim(),
        email: customer.email,
        role: Role.CUSTOMER,
        branch_id: null,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const lowerEmail = (loginDto.email || '').toLowerCase().trim();
    const inputPassword = loginDto.password || '';

    // 1. Search in employees table (Staff / Manager / System Admin login)
    const employee = await this.prisma.employees.findFirst({
      where: { email: { equals: lowerEmail, mode: 'insensitive' } },
      include: { branches: true },
    });

    if (employee) {
      if (!employee.password) {
        throw new UnauthorizedException('Invalid email or password.');
      }
      const isMatch = await bcrypt.compare(inputPassword, employee.password);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid email or password.');
      }

      const userRole: Role = employee.role as unknown as Role;
      const branchId = userRole === Role.SYSTEM_ADMIN ? null : (employee.branch_id || 1);
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

    // 2. Search in customers table (Customer login)
    const customer = await this.prisma.customers.findFirst({
      where: { email: { equals: lowerEmail, mode: 'insensitive' } },
    });

    if (customer) {
      if (!customer.password) {
        throw new UnauthorizedException('Invalid email or password.');
      }
      const isMatch = await bcrypt.compare(inputPassword, customer.password);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid email or password.');
      }

      const tokens = await this.generateTokens(customer.customer_id, customer.email || '', Role.CUSTOMER, null);
      return {
        ...tokens,
        user: {
          id: customer.customer_id,
          name: `${customer.first_name} ${customer.last_name || ''}`.trim(),
          email: customer.email,
          role: Role.CUSTOMER,
          branch_id: null,
        },
      };
    }

    // 3. Invalid credentials - No fallback admin tokens!
    throw new UnauthorizedException('Invalid email or password.');
  }

  async refreshTokens(userId: number | string, email: string, role: Role, branchId: number | null = null) {
    return this.generateTokens(userId, email, role, branchId);
  }

  private async generateTokens(id: number | string, email: string, role: Role, branchId: number | null = null) {
    const payload = { sub: id, email, role, branch_id: branchId };

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is not set');
    }

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtSecret,
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRY') as any) || '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: jwtRefreshSecret,
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRY') as any) || '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
