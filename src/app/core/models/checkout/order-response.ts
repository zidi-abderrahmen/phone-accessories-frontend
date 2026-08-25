import { OrderStatus } from "./enums/OrderStatus";
import { PaymentMethod } from "./enums/PaymentMethod";
import { ShippingMethod } from "./enums/ShippingMethod";
import { OrderItemResponse } from "./item/order-item-response";

export interface OrderResponse {
    id: number;
    customerFullName: string;
    customerEmail: string;
    customerPhoneNumber: string;
    customerStreet: string;
    customerCity: string;
    customerPostalCode: string;
    customerCountry: string;
    paymentMethod: PaymentMethod;
    status: OrderStatus;
    shippingMethod: ShippingMethod;
    notes: string;
    totalAmount: number;
    items: OrderItemResponse[];
}