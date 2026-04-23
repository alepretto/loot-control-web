export interface Subcategory {
	id: string;
	user_id: string;
	category_id: string;
	label: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface SubcategoryCreate {
	label: string;
	category_id: string;
	is_active?: boolean;
}

export interface SubcategoryUpdate {
	label?: string;
	category_id?: string;
	is_active?: boolean;
}
