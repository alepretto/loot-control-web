export type TransactionType = 'outcome' | 'income';
export type PaymentMethod = 'pix' | 'debit' | 'credit';

export interface Transaction {
	id: string;
	user_id: string;
	date_transaction: string;
	type: TransactionType;
	subcategory_id: string;
	account_id: string;
	currency_id: string;
	description: string | null;
	amount: number;
	payment_methods: PaymentMethod | null;
	statement_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface TransactionCreate {
	date_transaction: string;
	type: TransactionType;
	subcategory_id: string;
	account_id: string;
	currency_id: string;
	description?: string | null;
	amount: number;
	payment_methods?: PaymentMethod | null;
	statement_id?: string | null;
	credit_card_id?: string | null;
}

export interface TransactionUpdate {
	date_transaction?: string;
	type?: TransactionType;
	subcategory_id?: string;
	account_id?: string;
	currency_id?: string;
	description?: string | null;
	amount?: number;
	payment_methods?: PaymentMethod | null;
	statement_id?: string | null;
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
	outcome: 'Saída',
	income: 'Entrada'
};

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
	outcome: '#ef4444',
	income: '#22c55e'
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
	pix: 'Pix',
	debit: 'Débito',
	credit: 'Crédito'
};
