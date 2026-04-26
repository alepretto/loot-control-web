export interface Currency {
	id: string;
	code: string;
	label: string;
	symbol: string;
	created_at: string;
	updated_at: string;
}

export interface CurrencyCreate {
	code: string;
	label: string;
	symbol: string;
}

export interface CurrencyUpdate {
	code?: string;
	label?: string;
	symbol?: string;
}
