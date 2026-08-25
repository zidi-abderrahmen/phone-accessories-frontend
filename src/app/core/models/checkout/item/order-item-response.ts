import { AccessoryResponse } from "../../accessory/accessory-response";

export interface OrderItemResponse {
    id: number;
    accessory: AccessoryResponse;
    quantity: number;
    unitPrice: number;
}