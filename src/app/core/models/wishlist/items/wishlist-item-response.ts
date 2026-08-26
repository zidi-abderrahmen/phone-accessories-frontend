import { AccessoryResponse } from "../../accessory/accessory-response";

export interface WishlistItemResponse {
    id: number;
    accessory: AccessoryResponse;
    createdAt: string;
}