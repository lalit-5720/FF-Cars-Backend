import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client disconnected: No token provided (${client.id})`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET') || 'super-secret-jwt-key';
      const payload = await this.jwtService.verifyAsync(token, { secret });

      client.data.user = payload;

      // Join rooms by role and branch
      if (payload.role) {
        client.join(`role_${payload.role}`);
      }
      if (payload.branch_id) {
        client.join(`branch_${payload.branch_id}`);
      }

      this.logger.log(`Client connected: ${client.id} (User: ${payload.email}, Role: ${payload.role})`);
    } catch (err) {
      this.logger.error(`Handshake failed for ${client.id}: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_branch')
  handleJoinBranch(client: Socket, branchId: number) {
    client.join(`branch_${branchId}`);
    return { status: 'joined', branchId };
  }

  /**
   * Broadcast a notification event to relevant branch/role rooms or all connected clients
   */
  emitNotification(data: { title: string; message: string; type?: string; branchId?: number }) {
    if (this.server) {
      if (data.branchId) {
        this.server.to(`branch_${data.branchId}`).emit('notification', data);
        this.server.to('role_SYSTEM_ADMIN').emit('notification', data);
      } else {
        this.server.emit('notification', data);
      }
    }
  }

  /**
   * Broadcast vehicle availability status change
   */
  emitCarAvailabilityUpdated(data: { vehicleId: number; status: string; make?: string; model?: string; branchId?: number }) {
    if (this.server) {
      this.server.emit('car_availability_updated', data);
    }
  }
}
