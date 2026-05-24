import { WishlistService } from './wishlist.service';
import { ToggleWishlistDto } from './dto/toggle-wishlist.dto';
export declare class WishlistController {
    private readonly wishlistService;
    constructor(wishlistService: WishlistService);
    toggle(req: any, toggleDto: ToggleWishlistDto): Promise<{
        added: boolean;
    }>;
    getWishlist(req: any): Promise<any[]>;
    check(req: any, carId: string): Promise<{
        wishlisted: boolean;
    }>;
}
