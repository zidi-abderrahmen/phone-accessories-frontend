import { AccessoryResponse } from "../accessory/accessory-response";
import { RegisterResponse } from "../user/register/register.response";

export interface ReviewResponse {
    id: number;
    user: RegisterResponse;
    accessory: AccessoryResponse;
    rating: number;
    comment: string;
    createdAt: string;
    updatedAt: string;
    mine: boolean;
}