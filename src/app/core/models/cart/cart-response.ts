import { RegisterResponse } from "../user/register/register.response";
import { CartItemResponse } from "./items/cart-item-response";

export interface CartResponse {
    id: number;
    user: RegisterResponse;
    cartItems: CartItemResponse[];
    createdA: string;
    updateAt: string;
}