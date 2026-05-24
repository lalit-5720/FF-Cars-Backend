import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  // Active sockets map: userId -> socketId[]
  private activeConnections = new Map<string, string[]>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
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

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });
      const userId = payload.sub;

      client.data = { userId, email: payload.email, role: payload.role };

      const sockets = this.activeConnections.get(userId) || [];
      sockets.push(client.id);
      this.activeConnections.set(userId, sockets);

      this.logger.log(`User connected: ${userId} (${client.id})`);
    } catch (err: any) {
      this.logger.error(`Connection authentication failed: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      const sockets = this.activeConnections.get(userId) || [];
      const updated = sockets.filter((id) => id !== client.id);
      if (updated.length > 0) {
        this.activeConnections.set(userId, updated);
      } else {
        this.activeConnections.delete(userId);
      }
      this.logger.log(`User disconnected: ${userId} (${client.id})`);
    }
  }

  // Send a real-time message to a specific user
  sendToUser(userId: string, event: string, data: any) {
    const socketIds = this.activeConnections.get(userId);
    if (socketIds && socketIds.length > 0) {
      socketIds.forEach((id) => {
        this.server.to(id).emit(event, data);
      });
      return true;
    }
    return false;
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}
