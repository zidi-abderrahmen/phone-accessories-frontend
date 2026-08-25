import { PaymentMethod } from "./enums/PaymentMethod";
import { ShippingMethod } from "./enums/ShippingMethod";

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