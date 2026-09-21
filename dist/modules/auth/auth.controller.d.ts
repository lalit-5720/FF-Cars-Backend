import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class AuthController {
    private authService;
    private jwtService;
    private configService;
    constructor(authService: AuthService, jwtService: JwtService, configService: ConfigService);
    register(registerDto: RegisterDto): Promise<{
        user: {
            id: number;
            name: string;
            email: string | null;
            role: import("../../common/enums/role.enum").Role;
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
            role: import("../../common/enums/role.enum").Role;
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
            role: import("../../common/enums/role.enum").Role;
            branch_id: null;
            job_title?: undefined;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    getProfile(req: any): Promise<any>;
}
