export interface Currency {
	id: string;
	label: string;
	symbol: string;
	created_at: string;
	updated_at: string;
}

export interface CurrencyCreate {
	label: string;
	symbol: string;
}

export interface CurrencyUpdate {
	label?: string;
	symbol?: string;
}
