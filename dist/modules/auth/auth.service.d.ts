import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../../common/enums/role.enum';
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
            role: Role;
            branch_id: null;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        user: {
            id: number;
            name: string;
            email: string | null;
            role: Role;
            job_title: string;
            branch_id: number | null;
        };
        accessToken: string;
        refreshToken: string;
    } | {
        user: {
            id: number;
            name: string;
            email: string | null;
            role: Role;
            branch_id: null;
            job_title?: undefined;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refreshTokens(userId: number | string, email: string, role: Role, branchId?: number | null): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    private generateTokens;
}
