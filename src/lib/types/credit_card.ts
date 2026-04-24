export interface CreditCard {
	id: string;
	user_id: string;
	account_id: string;
	label: string;
	due_date: number;
	end_date_offset: number;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface CreditCardCreate {
	account_id: string;
	label: string;
	due_date: number;
	end_date_offset: number;
	is_active?: boolean;
}

export interface CreditCardUpdate {
	account_id?: string;
	label?: string;
	due_date?: number;
	end_date_offset?: number;
	is_active?: boolean;
}
