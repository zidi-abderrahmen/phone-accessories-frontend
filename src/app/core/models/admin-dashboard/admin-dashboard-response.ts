import { OrderResponse } from "../checkout/order-response";

export interface AdminDashboardResponse {
    totalOrders: number;
    totalPendingOrders: number;
    totalRevenue: number;
    totalUsers: number;
    TotalAccessories: number;
    lastOrders: OrderResponse[];
}