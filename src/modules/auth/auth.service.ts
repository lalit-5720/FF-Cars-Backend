import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User, Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    const hashedPassword = await this.hashPassword(registerDto.password);
    
    const user = await this.usersService.create({
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
      role: registerDto.role || Role.CUSTOMER,
    });

    const { password, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: Omit<User, 'password'> }> {
    const user = await this.usersService.findOneByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    const { password, ...userWithoutPassword } = user;

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  async refreshTokens(userId: string, email: string, role: Role): Promise<{ accessToken: string; refreshToken: string }> {
    // In a fully stateless JWT or with dynamic checking, we can also verify the user exists
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return this.generateTokens(userId, email, role);
  }

  private async generateTokens(userId: string, email: string, role: Role): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRY') as any) || '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRY') as any) || '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
