export interface ExchangeRate {
	id: string;
	from_currency: string;
	to_currency: string;
	rate_date: string;
	rate: number;
	created_at: string;
}

export interface ExchangeRateCreate {
	from_currency: string;
	to_currency?: string;
	rate_date: string;
	rate: number;
}
