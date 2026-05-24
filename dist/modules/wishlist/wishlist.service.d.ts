import { PrismaService } from '../../prisma/prisma.service';
import { ToggleWishlistDto } from './dto/toggle-wishlist.dto';
export declare class WishlistService {
    private prisma;
    constructor(prisma: PrismaService);
    toggleWishlist(userId: string, toggleDto: ToggleWishlistDto): Promise<{
        added: boolean;
    }>;
    getWishlist(userId: string): Promise<any[]>;
    checkWishlistStatus(userId: string, carId: string): Promise<{
        wishlisted: boolean;
    }>;
}
