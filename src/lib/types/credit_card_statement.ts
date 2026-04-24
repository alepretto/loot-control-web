export interface CreditCardStatement {
	id: string;
	user_id: string;
	credit_card_id: string;
	end_date: string;
	is_paid: boolean;
	total_amount: number | null;
	created_at: string;
	updated_at: string;
}

export interface CreditCardStatementCreate {
	credit_card_id: string;
	end_date: string;
	is_paid?: boolean;
	total_amount?: number | null;
}

export interface CreditCardStatementUpdate {
	end_date?: string;
	is_paid?: boolean;
	total_amount?: number | null;
}
