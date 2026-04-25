export interface Investment {
	id: string;
	user_id: string;
	transaction_id: string;
	symbol: string;
	quantity: number;
	currency: string;
	purchase_exchange_rate: number | null;
	index: string | null;
	index_rate: number | null;
	created_at: string;
	updated_at: string;
}

export interface InvestmentCreate {
	transaction_id: string;
	symbol: string;
	quantity: number;
	currency?: string;
	purchase_exchange_rate?: number | null;
	index?: string | null;
	index_rate?: number | null;
}

export interface InvestmentUpdate {
	symbol?: string;
	quantity?: number;
	currency?: string;
	purchase_exchange_rate?: number | null;
	index?: string | null;
	index_rate?: number | null;
}

export interface PortfolioSummary {
	total_invested: number;
	total_current_value: number;
	total_return: number;
	total_return_pct: number;
	by_category: PortfolioCategory[];
}

export interface PortfolioCategory {
	category: string;
	total_invested: number;
	total_current_value: number;
	total_return: number;
	total_return_pct: number;
	weight_pct: number;
	assets: PortfolioAsset[];
}

export interface PortfolioAsset {
	symbol: string;
	quantity: number;
	total_invested: number;
	current_price: number | null;
	current_value: number;
	return_pct: number;
	weight_in_category: number;
}

export interface TimelineEntry {
	date: string;
	invested: number;
	market_value: number;
}
