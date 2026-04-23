<script lang="ts">
	import {
		getCategories,
		createCategory,
		updateCategory,
		deleteCategory,
		getSubcategories,
		createSubcategory,
		updateSubcategory,
		deleteSubcategory,
		getCurrencies,
		createCurrency,
		updateCurrency,
		deleteCurrency
	} from '$lib/api';
	import {
		CATEGORY_NATURE_LABELS,
		CATEGORY_NATURE_COLORS,
		CATEGORY_NATURE_ICONS,
		CATEGORY_NATURE_ORDER,
		type Category,
		type CategoryNature
	} from '$lib/types/category';
	import type { Subcategory } from '$lib/types/subcategory';
	import type { Currency } from '$lib/types/currency';
	import { onMount } from 'svelte';

	type TabId = 'categories' | 'subcategories' | 'currencies';

	let activeTab = $state<TabId>('categories');
	let categories = $state<Category[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let editingId = $state<string | null>(null);

	let label = $state('');
	let nature = $state<CategoryNature>('fixed');
	let formError = $state('');
	let deletingId = $state<string | null>(null);

	// Subcategory state
	let subcategories = $state<Subcategory[]>([]);
	let showSubForm = $state(false);
	let subEditingId = $state<string | null>(null);
	let subLabel = $state('');
	let subCategoryId = $state('');
	let subIsActive = $state(true);
	let subFormError = $state('');
	let subDeletingId = $state<string | null>(null);
	let collapsedSubCategories = $state<Set<string>>(new Set());

	// Currency state
	let currencies = $state<Currency[]>([]);
	let showCurForm = $state(false);
	let curEditingId = $state<string | null>(null);
	let curLabel = $state('');
	let curSymbol = $state('');
	let curFormError = $state('');
	let curDeletingId = $state<string | null>(null);

	function toggleSubCategoryGroup(categoryId: string) {
		if (collapsedSubCategories.has(categoryId)) {
			collapsedSubCategories.delete(categoryId);
		} else {
			collapsedSubCategories.add(categoryId);
		}
		collapsedSubCategories = new Set(collapsedSubCategories);
	}

	const tabs: { id: TabId; label: string }[] = [
		{ id: 'categories', label: 'Categorias' },
		{ id: 'subcategories', label: 'Subcategorias' },
		{ id: 'currencies', label: 'Moedas' }
	];

	onMount(async () => {
		await loadCategories();
	});

	async function loadCategories() {
		try {
			categories = await getCategories();
		} catch (e: any) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		label = '';
		nature = 'fixed';
		formError = '';
		editingId = null;
	}

	function openCreate() {
		resetForm();
		showForm = true;
	}

	function openEdit(category: Category) {
		label = category.label;
		nature = category.nature;
		editingId = category.id;
		showForm = true;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		formError = '';

		try {
			if (editingId) {
				await updateCategory(editingId, { label, nature });
			} else {
				await createCategory({ label, nature });
			}
			showForm = false;
			resetForm();
			await loadCategories();
		} catch (e: any) {
			formError = e.message || 'Erro ao salvar';
		}
	}

	async function handleDelete(id: string) {
		try {
			await deleteCategory(id);
			deletingId = null;
			await loadCategories();
		} catch (e: any) {
			console.error(e);
		}
	}

	// Subcategory functions
	async function loadSubcategories() {
		try {
			subcategories = await getSubcategories();
		} catch (e: any) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function resetSubForm() {
		subLabel = '';
		subCategoryId = categories.length > 0 ? categories[0].id : '';
		subIsActive = true;
		subFormError = '';
		subEditingId = null;
	}

	function openSubCreate() {
		resetSubForm();
		showSubForm = true;
	}

	function openSubEdit(subcategory: Subcategory) {
		subLabel = subcategory.label;
		subCategoryId = subcategory.category_id;
		subIsActive = subcategory.is_active;
		subEditingId = subcategory.id;
		showSubForm = true;
	}

	async function handleSubSubmit(e: Event) {
		e.preventDefault();
		subFormError = '';

		try {
			if (subEditingId) {
				await updateSubcategory(subEditingId, { label: subLabel, category_id: subCategoryId, is_active: subIsActive });
			} else {
				await createSubcategory({ label: subLabel, category_id: subCategoryId, is_active: subIsActive });
			}
			showSubForm = false;
			resetSubForm();
			await loadSubcategories();
		} catch (e: any) {
			subFormError = e.message || 'Erro ao salvar';
		}
	}

	async function handleSubDelete(id: string) {
		try {
			await deleteSubcategory(id);
			subDeletingId = null;
			await loadSubcategories();
		} catch (e: any) {
			console.error(e);
		}
	}

	async function toggleSubActive(subcategory: Subcategory) {
		try {
			await updateSubcategory(subcategory.id, { is_active: !subcategory.is_active });
			await loadSubcategories();
		} catch (e: any) {
			console.error(e);
		}
	}

	function groupByCategory(): { category: Category; subcategories: Subcategory[] }[] {
		const groups = new Map<string, Subcategory[]>();
		for (const s of subcategories) {
			const list = groups.get(s.category_id) ?? [];
			list.push(s);
			groups.set(s.category_id, list);
		}
		return categories
			.filter((c) => groups.has(c.id))
			.map((c) => ({ category: c, subcategories: groups.get(c.id)! }));
	}

	function groupByNature(): { nature: CategoryNature; categories: Category[] }[] {
		const groups = new Map<CategoryNature, Category[]>();
		for (const c of categories) {
			const list = groups.get(c.nature) ?? [];
			list.push(c);
			groups.set(c.nature, list);
		}
		return CATEGORY_NATURE_ORDER
			.filter((n) => groups.has(n))
			.map((n) => ({ nature: n, categories: groups.get(n)! }));
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
	}

	// Currency functions
	async function loadCurrencies() {
		try {
			currencies = await getCurrencies();
		} catch (e: any) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function resetCurForm() {
		curLabel = '';
		curSymbol = '';
		curFormError = '';
		curEditingId = null;
	}

	function openCurCreate() {
		resetCurForm();
		showCurForm = true;
	}

	function openCurEdit(currency: Currency) {
		curLabel = currency.label;
		curSymbol = currency.symbol;
		curEditingId = currency.id;
		showCurForm = true;
	}

	async function handleCurSubmit(e: Event) {
		e.preventDefault();
		curFormError = '';

		try {
			if (curEditingId) {
				await updateCurrency(curEditingId, { label: curLabel, symbol: curSymbol });
			} else {
				await createCurrency({ label: curLabel, symbol: curSymbol });
			}
			showCurForm = false;
			resetCurForm();
			await loadCurrencies();
		} catch (e: any) {
			curFormError = e.message || 'Erro ao salvar';
		}
	}

	async function handleCurDelete(id: string) {
		try {
			await deleteCurrency(id);
			curDeletingId = null;
			await loadCurrencies();
		} catch (e: any) {
			console.error(e);
		}
	}
</script>

<div class="px-4 md:px-6 py-5 space-y-5">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-bold text-text-primary">Dados</h1>
			<p class="text-sm text-muted mt-0.5">Gerencie categorias, subcategorias e moedas</p>
		</div>
		{#if activeTab === 'categories'}
			<button
				onclick={openCreate}
				class="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
			>
				+ Nova categoria
			</button>
		{:else if activeTab === 'subcategories'}
			<button
				onclick={openSubCreate}
				class="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
			>
				+ Nova subcategoria
			</button>
		{:else if activeTab === 'currencies'}
			<button
				onclick={openCurCreate}
				class="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
			>
				+ Nova moeda
			</button>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="flex gap-1 bg-surface border border-border rounded-lg p-1">
		{#each tabs as tab (tab.id)}
			<button
				onclick={() => {
					activeTab = tab.id;
					loading = true;
					if (tab.id === 'categories') loadCategories();
					else if (tab.id === 'subcategories') loadSubcategories();
					else if (tab.id === 'currencies') loadCurrencies();
					else loading = false;
				}}
				class="flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors {activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted hover:text-text-primary hover:bg-surface-2'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Categories Tab -->
	{#if activeTab === 'categories'}
		{#if loading}
			<div class="text-muted text-sm animate-fade-in">Carregando...</div>
		{:else if categories.length === 0}
			<div class="bg-surface border border-border rounded-xl p-8 text-center animate-fade-up">
				<p class="text-muted">Nenhuma categoria cadastrada</p>
				<p class="text-text-secondary text-sm mt-1">Clique em "Nova categoria" para começar</p>
			</div>
		{:else}
			{#each groupByNature() as group (group.nature)}
				<div class="space-y-2">
					<div class="flex items-center gap-2 px-1">
						<span class="text-base">{CATEGORY_NATURE_ICONS[group.nature]}</span>
						<h2 class="text-sm font-semibold text-muted uppercase tracking-wider">{CATEGORY_NATURE_LABELS[group.nature]}</h2>
						<span class="text-xs text-text-secondary">{group.categories.length}</span>
					</div>
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
						{#each group.categories as category (category.id)}
							<div
								class="bg-surface border border-border rounded-lg p-3 hover:bg-surface-2/60 transition-all group"
							>
								<div class="flex items-center gap-2.5 mb-2">
									<div
										class="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold shrink-0"
										style="background-color: {CATEGORY_NATURE_COLORS[category.nature]}15; color: {CATEGORY_NATURE_COLORS[category.nature]}"
									>
										{category.label.charAt(0).toUpperCase()}
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-text-primary font-medium text-sm truncate">{category.label}</p>
									</div>
									<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<span
											onclick={() => openEdit(category)}
											class="text-muted hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
										>
											Editar
										</span>
										<span
											onclick={() => deletingId = category.id}
											class="text-muted hover:text-danger text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
										>
											Excluir
										</span>
									</div>
								</div>
								<div class="space-y-1.5">
									<div class="flex items-center justify-between">
										<span
											class="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded"
											style="background-color: {CATEGORY_NATURE_COLORS[category.nature]}15; color: {CATEGORY_NATURE_COLORS[category.nature]}"
										>
											{CATEGORY_NATURE_ICONS[category.nature]} {CATEGORY_NATURE_LABELS[category.nature]}
										</span>
									</div>
									<div class="flex items-center justify-between text-[11px]">
										<span class="text-text-secondary">Criada</span>
										<span class="text-text-primary font-data">{formatDate(category.created_at)}</span>
									</div>
									<div class="flex items-center justify-between text-[11px]">
										<span class="text-text-secondary">Atualizada</span>
										<span class="text-text-primary font-data">{formatDate(category.updated_at)}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	{:else if activeTab === 'subcategories'}
		{#if loading}
			<div class="text-muted text-sm animate-fade-in">Carregando...</div>
		{:else if subcategories.length === 0}
			<div class="bg-surface border border-border rounded-xl p-8 text-center animate-fade-up">
				<p class="text-muted">Nenhuma subcategoria cadastrada</p>
				<p class="text-text-secondary text-sm mt-1">Clique em "Nova subcategoria" para começar</p>
			</div>
		{:else}
			{#each groupByCategory() as group (group.category.id)}
				<div class="space-y-2">
					<div class="flex items-center gap-2 px-1 cursor-pointer select-none" onclick={() => toggleSubCategoryGroup(group.category.id)}>
						<div
							class="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-semibold shrink-0"
							style="background-color: {CATEGORY_NATURE_COLORS[group.category.nature]}15; color: {CATEGORY_NATURE_COLORS[group.category.nature]}"
						>
							{group.category.label.charAt(0).toUpperCase()}
						</div>
						<h2 class="text-sm font-semibold text-muted uppercase tracking-wider">{group.category.label}</h2>
						<span class="text-xs text-text-secondary">{group.subcategories.length}</span>
						<span class="text-muted transition-transform duration-200 {collapsedSubCategories.has(group.category.id) ? '-rotate-90' : 'rotate-0'}">▾</span>
					</div>
					{#if !collapsedSubCategories.has(group.category.id)}
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
						{#each group.subcategories as sub (sub.id)}
							<div
								class="bg-surface border border-border rounded-lg p-3 hover:bg-surface-2/60 transition-all group"
							>
								<div class="flex items-center gap-2.5 mb-2">
									<div class="min-w-0 flex-1">
										<p class="text-text-primary font-medium text-sm truncate">{sub.label}</p>
									</div>
									<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<span
											onclick={() => openSubEdit(sub)}
											class="text-muted hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
										>
											Editar
										</span>
										<span
											onclick={() => subDeletingId = sub.id}
											class="text-muted hover:text-danger text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
										>
											Excluir
										</span>
									</div>
								</div>
								<div class="space-y-1.5">
									<div class="flex items-center justify-between">
										<button
											onclick={() => toggleSubActive(sub)}
											class="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors {sub.is_active ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}"
										>
											{sub.is_active ? 'Ativo' : 'Inativo'}
										</button>
									</div>
									<div class="flex items-center justify-between text-[11px]">
										<span class="text-text-secondary">Criada</span>
										<span class="text-text-primary font-data">{formatDate(sub.created_at)}</span>
									</div>
									<div class="flex items-center justify-between text-[11px]">
										<span class="text-text-secondary">Atualizada</span>
										<span class="text-text-primary font-data">{formatDate(sub.updated_at)}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
					{/if}
				</div>
			{/each}
		{/if}
	{:else if activeTab === 'currencies'}
		{#if loading}
			<div class="text-muted text-sm animate-fade-in">Carregando...</div>
		{:else if currencies.length === 0}
			<div class="bg-surface border border-border rounded-xl p-8 text-center animate-fade-up">
				<p class="text-muted">Nenhuma moeda cadastrada</p>
				<p class="text-text-secondary text-sm mt-1">Clique em "Nova moeda" para começar</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
				{#each currencies as currency (currency.id)}
					<div
						class="bg-surface border border-border rounded-lg p-3 hover:bg-surface-2/60 transition-all group"
					>
						<div class="flex items-center gap-2.5 mb-2">
							<div
								class="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold shrink-0 bg-primary/10 text-primary"
							>
								{currency.symbol}
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-text-primary font-medium text-sm truncate">{currency.label}</p>
							</div>
							<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<span
									onclick={() => openCurEdit(currency)}
									class="text-muted hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
								>
									Editar
								</span>
								<span
									onclick={() => curDeletingId = currency.id}
									class="text-muted hover:text-danger text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
								>
									Excluir
								</span>
							</div>
						</div>
						<div class="space-y-1.5">
							<div class="flex items-center justify-between text-[11px]">
								<span class="text-text-secondary">Criada</span>
								<span class="text-text-primary font-data">{formatDate(currency.created_at)}</span>
							</div>
							<div class="flex items-center justify-between text-[11px]">
								<span class="text-text-secondary">Atualizada</span>
								<span class="text-text-primary font-data">{formatDate(currency.updated_at)}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- Create/Edit Modal -->
{#if showForm}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => { showForm = false; resetForm(); }} onkeydown={(e) => { if (e.key === 'Escape') { showForm = false; resetForm(); } }} role="presentation">
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
		<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<h2 class="text-lg font-bold text-text-primary mb-4">
				{editingId ? 'Editar categoria' : 'Nova categoria'}
			</h2>

			{#if formError}
				<div class="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 mb-4 text-sm">
					{formError}
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="cat-label" class="block text-sm text-muted mb-1">Nome da categoria</label>
					<input
						id="cat-label"
						type="text"
						bind:value={label}
						required
						minlength={1}
						class="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
						placeholder="Alimentação"
					/>
				</div>

				<div>
					<label for="cat-nature" class="block text-sm text-muted mb-1">Natureza</label>
					<select
						id="cat-nature"
						bind:value={nature}
						class="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
					>
						{#each Object.entries(CATEGORY_NATURE_LABELS) as [value, label_str]}
							<option value={value}>{label_str}</option>
						{/each}
					</select>
				</div>

				<div class="flex gap-3 pt-2">
					<button
						type="submit"
						class="flex-1 bg-primary hover:bg-primary-hover text-white rounded-lg py-2 text-sm font-medium transition-colors"
					>
						{editingId ? 'Salvar' : 'Criar'}
					</button>
					<button
						type="button"
						onclick={() => { showForm = false; resetForm(); }}
						class="flex-1 text-muted hover:text-text-primary border border-border rounded-lg py-2 text-sm transition-colors"
					>
						Cancelar
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deletingId}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => deletingId = null} onkeydown={(e) => { if (e.key === 'Escape') deletingId = null; }} role="presentation">
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
		<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<h2 class="text-lg font-bold text-text-primary mb-2">Excluir categoria</h2>
			<p class="text-muted text-sm mb-6">Tem certeza? Esta ação não pode ser desfeita.</p>
			<div class="flex gap-3">
				<button
					onclick={() => handleDelete(deletingId!)}
					class="flex-1 bg-danger/15 text-danger border border-danger/30 rounded-lg py-2 text-sm font-medium hover:bg-danger/25 transition-colors"
				>
					Excluir
				</button>
				<button
					onclick={() => deletingId = null}
					class="flex-1 text-muted hover:text-text-primary border border-border rounded-lg py-2 text-sm transition-colors"
				>
					Cancelar
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Subcategory Create/Edit Modal -->
{#if showSubForm}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => { showSubForm = false; resetSubForm(); }} onkeydown={(e) => { if (e.key === 'Escape') { showSubForm = false; resetSubForm(); } }} role="presentation">
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
		<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<h2 class="text-lg font-bold text-text-primary mb-4">
				{subEditingId ? 'Editar subcategoria' : 'Nova subcategoria'}
			</h2>

			{#if subFormError}
				<div class="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 mb-4 text-sm">
					{subFormError}
				</div>
			{/if}

			<form onsubmit={handleSubSubmit} class="space-y-4">
				<div>
					<label for="sub-label" class="block text-sm text-muted mb-1">Nome da subcategoria</label>
					<input
						id="sub-label"
						type="text"
						bind:value={subLabel}
						required
						minlength={1}
						class="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
						placeholder="Ex: Supermercado"
					/>
				</div>

				<div>
					<label for="sub-category" class="block text-sm text-muted mb-1">Categoria</label>
					<select
						id="sub-category"
						bind:value={subCategoryId}
						class="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
					>
						{#each categories as cat}
							<option value={cat.id}>{cat.label}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-center gap-2">
					<input
						id="sub-active"
						type="checkbox"
						bind:checked={subIsActive}
						class="w-4 h-4 rounded border-border text-primary focus:ring-primary/50 bg-surface-3"
					/>
					<label for="sub-active" class="text-sm text-text-primary">Ativo</label>
				</div>

				<div class="flex gap-3 pt-2">
					<button
						type="submit"
						class="flex-1 bg-primary hover:bg-primary-hover text-white rounded-lg py-2 text-sm font-medium transition-colors"
					>
						{subEditingId ? 'Salvar' : 'Criar'}
					</button>
					<button
						type="button"
						onclick={() => { showSubForm = false; resetSubForm(); }}
						class="flex-1 text-muted hover:text-text-primary border border-border rounded-lg py-2 text-sm transition-colors"
					>
						Cancelar
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Subcategory Delete Confirmation Modal -->
{#if subDeletingId}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => subDeletingId = null} onkeydown={(e) => { if (e.key === 'Escape') subDeletingId = null; }} role="presentation">
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
		<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<h2 class="text-lg font-bold text-text-primary mb-2">Excluir subcategoria</h2>
			<p class="text-muted text-sm mb-6">Tem certeza? Esta ação não pode ser desfeita.</p>
			<div class="flex gap-3">
				<button
					onclick={() => handleSubDelete(subDeletingId!)}
					class="flex-1 bg-danger/15 text-danger border border-danger/30 rounded-lg py-2 text-sm font-medium hover:bg-danger/25 transition-colors"
				>
					Excluir
				</button>
				<button
					onclick={() => subDeletingId = null}
					class="flex-1 text-muted hover:text-text-primary border border-border rounded-lg py-2 text-sm transition-colors"
				>
					Cancelar
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Currency Create/Edit Modal -->
{#if showCurForm}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => { showCurForm = false; resetCurForm(); }} onkeydown={(e) => { if (e.key === 'Escape') { showCurForm = false; resetCurForm(); } }} role="presentation">
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
		<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<h2 class="text-lg font-bold text-text-primary mb-4">
				{curEditingId ? 'Editar moeda' : 'Nova moeda'}
			</h2>

			{#if curFormError}
				<div class="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 mb-4 text-sm">
					{curFormError}
				</div>
			{/if}

			<form onsubmit={handleCurSubmit} class="space-y-4">
				<div>
					<label for="cur-label" class="block text-sm text-muted mb-1">Nome da moeda</label>
					<input
						id="cur-label"
						type="text"
						bind:value={curLabel}
						required
						minlength={1}
						class="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
						placeholder="Real Brasileiro"
					/>
				</div>

				<div>
					<label for="cur-symbol" class="block text-sm text-muted mb-1">Símbolo</label>
					<input
						id="cur-symbol"
						type="text"
						bind:value={curSymbol}
						required
						minlength={1}
						class="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
						placeholder="R$"
					/>
				</div>

				<div class="flex gap-3 pt-2">
					<button
						type="submit"
						class="flex-1 bg-primary hover:bg-primary-hover text-white rounded-lg py-2 text-sm font-medium transition-colors"
					>
						{curEditingId ? 'Salvar' : 'Criar'}
					</button>
					<button
						type="button"
						onclick={() => { showCurForm = false; resetCurForm(); }}
						class="flex-1 text-muted hover:text-text-primary border border-border rounded-lg py-2 text-sm transition-colors"
					>
						Cancelar
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Currency Delete Confirmation Modal -->
{#if curDeletingId}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => curDeletingId = null} onkeydown={(e) => { if (e.key === 'Escape') curDeletingId = null; }} role="presentation">
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
		<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<h2 class="text-lg font-bold text-text-primary mb-2">Excluir moeda</h2>
			<p class="text-muted text-sm mb-6">Tem certeza? Esta ação não pode ser desfeita.</p>
			<div class="flex gap-3">
				<button
					onclick={() => handleCurDelete(curDeletingId!)}
					class="flex-1 bg-danger/15 text-danger border border-danger/30 rounded-lg py-2 text-sm font-medium hover:bg-danger/25 transition-colors"
				>
					Excluir
				</button>
				<button
					onclick={() => curDeletingId = null}
					class="flex-1 text-muted hover:text-text-primary border border-border rounded-lg py-2 text-sm transition-colors"
				>
					Cancelar
				</button>
			</div>
		</div>
	</div>
{/if}
