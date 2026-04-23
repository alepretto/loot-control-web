export interface AuthUser {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	role: 'user' | 'admin';
	is_active: boolean;
}

export interface AuthToken {
	access_token: string;
	token_type: string;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface SignupRequest {
	first_name: string;
	last_name: string;
	email: string;
	password: string;
}

export interface ApiError {
	detail: string;
}