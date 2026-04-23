export type CategoryNature = 'fixed' | 'variable' | 'investment' | 'revenue';

export interface Category {
	id: string;
	user_id: string;
	label: string;
	nature: CategoryNature;
	created_at: string;
	updated_at: string;
}

export interface CategoryCreate {
	label: string;
	nature: CategoryNature;
}

export interface CategoryUpdate {
	label?: string;
	nature?: CategoryNature;
}

export const CATEGORY_NATURE_LABELS: Record<CategoryNature, string> = {
	fixed: 'Fixa',
	variable: 'Variável',
	investment: 'Investimento',
	revenue: 'Receita'
};

export const CATEGORY_NATURE_COLORS: Record<CategoryNature, string> = {
	fixed: '#eab308',
	variable: '#f97316',
	investment: '#3b82f6',
	revenue: '#22c55e'
};

export const CATEGORY_NATURE_ICONS: Record<CategoryNature, string> = {
	fixed: '📌',
	variable: '🔄',
	investment: '📈',
	revenue: '💰'
};

export const CATEGORY_NATURE_ORDER: CategoryNature[] = ['fixed', 'variable', 'investment', 'revenue'];