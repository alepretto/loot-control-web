export interface AssetPrice {
	id: string;
	symbol: string;
	price_date: string;
	price: number;
	currency: string;
	created_at: string;
}

export interface AssetPriceCreate {
	symbol: string;
	price_date: string;
	price: number;
	currency?: string;
}
