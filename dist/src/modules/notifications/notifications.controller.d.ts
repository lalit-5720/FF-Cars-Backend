import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(req: any): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        message: string;
        readStatus: boolean;
    }[]>;
    markAllRead(req: any): Promise<any>;
    markRead(req: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        message: string;
        readStatus: boolean;
    }>;
}
