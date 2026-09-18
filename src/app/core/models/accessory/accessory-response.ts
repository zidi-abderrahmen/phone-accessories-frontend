import { CategoryResponse } from "../category/category-response";

export interface AccessoryResponse {
    id: number;
    imageUrl: string;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    stock: number;
    category: CategoryResponse;
    productCode: string;
    rating?: number;
    reviewCount?: number;
    createdAt: string;
    updatedAt: string;
}