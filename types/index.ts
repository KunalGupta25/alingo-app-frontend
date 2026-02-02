export interface User {
    user_id: string;
    firebase_uid: string;
    phone: string;
    verification_status: 'PENDING' | 'VERIFIED' | 'UNVERIFIED' | 'REJECTED';
    created_at: string;
}

export interface AuthResponse {
    user_id: string;
    firebase_uid: string;
    phone: string;
    verification_status: 'PENDING' | 'VERIFIED' | 'UNVERIFIED' | 'REJECTED';
    created_at: string;
}

export interface SignupRequest {
    firebase_token: string;
}

export interface LoginRequest {
    firebase_token: string;
}
