import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private configService;
    private readonly logger;
    server: Server;
    private activeConnections;
    constructor(jwtService: JwtService, configService: ConfigService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    sendToUser(userId: string, event: string, data: any): boolean;
    broadcast(event: string, data: any): void;
}
