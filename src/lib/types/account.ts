export type AccountType = 'bank' | 'wallet' | 'digital' | 'benefits';

export interface Account {
	id: string;
	user_id: string;
	label: string;
	type: AccountType;
	logo: string | null;
	created_at: string;
	updated_at: string;
}

export interface AccountCreate {
	label: string;
	type: AccountType;
	logo?: string | null;
}

export interface AccountUpdate {
	label?: string;
	type?: AccountType;
	logo?: string | null;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
	bank: 'Banco',
	wallet: 'Carteira',
	digital: 'Digital',
	benefits: 'Benefícios'
};

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
	bank: '#2563eb',
	wallet: '#22c55e',
	digital: '#a855f7',
	benefits: '#f97316'
};