import { AccessoryResponse } from "../../accessory/accessory-response";

export interface CartItemResponse {
    id: number;
    accessoryResponse: AccessoryResponse;
    quantity: number;
}