import { RegisterRequest } from "../register/register.request";

export interface ChangePasswordResponse {
    user: RegisterRequest;
    message: string;
}