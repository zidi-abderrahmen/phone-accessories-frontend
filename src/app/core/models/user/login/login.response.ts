import { RefreshTokenResponse } from "../../reftoken/refresh.token.response";
import { RegisterResponse } from "../register/register.response";

export interface LoginResponse {
    tokens: RefreshTokenResponse;
    user: RegisterResponse;
}