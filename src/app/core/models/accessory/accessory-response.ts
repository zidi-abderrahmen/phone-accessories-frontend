import { CategoryResponse } from "../category/category-response";

export interface AccessoryResponse {
    id: number;
    imageUrl: string;
    title: string;
    description: string;
    price: number;
    stock: number;
    category: CategoryResponse;
    productCode: string;
    createdAt: string;
    updatedAt: string;
}