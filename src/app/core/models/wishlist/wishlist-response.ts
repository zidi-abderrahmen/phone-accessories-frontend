import { RegisterResponse } from "../user/register/register.response";
import { WishlistItemResponse } from "./items/wishlist-item-response";

export interface WishlistResponse {
    id: number;
    user: RegisterResponse;
    items: WishlistItemResponse[];
}