import { OrderStatus } from "./enums/order-status";
import { PaymentMethod } from "./enums/payment-method";
import { ShippingMethod } from "./enums/shipping-method";
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