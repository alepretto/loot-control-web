export interface AuthUser {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	role: 'user' | 'admin';
	is_active: boolean;
	display_currency_id: string | null;
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

export interface UserPreferencesUpdate {
	display_currency_id: string | null;
}

export interface UpdateExchangeRatesRequest {
	from_currency: string;
	to_currency: string;
	start_date: string;
	end_date: string;
}

export interface UpdateExchangeRatesResponse {
	total_processed: number;
	from_currency: string;
	to_currency: string;
	start_date: string;
	end_date: string;
	days_requested: number;
}

export interface ApiError {
	detail: string;
}