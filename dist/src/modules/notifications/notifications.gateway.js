"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
let NotificationsGateway = NotificationsGateway_1 = class NotificationsGateway {
    jwtService;
    configService;
    logger = new common_1.Logger(NotificationsGateway_1.name);
    server;
    activeConnections = new Map();
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async handleConnection(client) {
        try {
            const authHeader = client.handshake.headers.authorization || client.handshake.auth?.token || client.handshake.query?.token;
            let token = '';
            if (authHeader) {
                token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
            }
            if (!token) {
                this.logger.warn(`Unauthenticated client connection rejected: ${client.id}`);
                client.disconnect();
                return;
            }
            const secret = this.configService.get('JWT_SECRET');
            const payload = await this.jwtService.verifyAsync(token, { secret });
            const userId = payload.sub;
            client.data = { userId, email: payload.email, role: payload.role };
            const sockets = this.activeConnections.get(userId) || [];
            sockets.push(client.id);
            this.activeConnections.set(userId, sockets);
            this.logger.log(`User connected: ${userId} (${client.id})`);
        }
        catch (err) {
            this.logger.error(`Connection authentication failed: ${err.message}`);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        const userId = client.data?.userId;
        if (userId) {
            const sockets = this.activeConnections.get(userId) || [];
            const updated = sockets.filter((id) => id !== client.id);
            if (updated.length > 0) {
                this.activeConnections.set(userId, updated);
            }
            else {
                this.activeConnections.delete(userId);
            }
            this.logger.log(`User disconnected: ${userId} (${client.id})`);
        }
    }
    sendToUser(userId, event, data) {
        const socketIds = this.activeConnections.get(userId);
        if (socketIds && socketIds.length > 0) {
            socketIds.forEach((id) => {
                this.server.to(id).emit(event, data);
            });
            return true;
        }
        return false;
    }
    broadcast(event, data) {
        this.server.emit(event, data);
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsGateway.prototype, "server", void 0);
exports.NotificationsGateway = NotificationsGateway = NotificationsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], NotificationsGateway);
//# sourceMappingURL=notifications.gateway.js.map