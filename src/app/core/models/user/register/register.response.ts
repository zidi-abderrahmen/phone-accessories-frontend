export interface RegisterResponse {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    roles: string[];
    enabled: boolean;
    blocked: boolean;
    deleted: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string;
}