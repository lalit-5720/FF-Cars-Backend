import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    register(registerDto: RegisterDto): Promise<{
        user: {
            id: number;
            name: string;
            email: string | null;
            role: string;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        user: {
            id: number;
            name: string;
            email: string;
            role: string;
            job_title: string;
            branch_id: null;
        };
        accessToken: string;
        refreshToken: string;
    } | {
        user: {
            id: number;
            name: string;
            email: string | null;
            role: string;
            job_title: string;
            branch_id: number;
        };
        accessToken: string;
        refreshToken: string;
    } | {
        user: {
            id: number;
            name: string;
            email: string | null;
            role: string;
            job_title?: undefined;
            branch_id?: undefined;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refreshTokens(userId: number | string, email: string, role: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    private generateTokens;
}
