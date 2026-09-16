import { PaymentMethod } from "./enums/payment-method";
import { ShippingMethod } from "./enums/shipping-method";

export interface OrderRequest {
    customerFullName: string;
    customerEmail: string;
    customerPhoneNumber: string;
    customerStreet: string;
    customerCity: string;
    customerPostalCode: string;
    customerCountry: string;
    paymentMethod: PaymentMethod;
    shippingMethod: ShippingMethod;
    notes: string;
}