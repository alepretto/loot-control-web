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
	import { Plus, Pencil, Trash2, ChevronDown, Coins, Tag, Layers } from 'lucide-svelte';

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
	let deleteError = $state('');

	// Subcategory state
	let subcategories = $state<Subcategory[]>([]);
	let showSubForm = $state(false);
	let subEditingId = $state<string | null>(null);
	let subLabel = $state('');
	let subNature = $state<CategoryNature>('fixed');
	let subCategoryId = $state('');
	let subIsActive = $state(true);
	let subFormError = $state('');
	let subDeletingId = $state<string | null>(null);
	let subDeleteError = $state('');
	let collapsedSubCategories = $state<Set<string>>(new Set());

	let filteredCategories = $derived(
		categories.filter((c) => c.nature === subNature)
	);

	// Currency state
	let currencies = $state<Currency[]>([]);
	let showCurForm = $state(false);
	let curEditingId = $state<string | null>(null);
	let curLabel = $state('');
	let curSymbol = $state('');
	let curFormError = $state('');
	let curDeletingId = $state<string | null>(null);
	let curDeleteError = $state('');

	function toggleSubCategoryGroup(categoryId: string) {
		if (collapsedSubCategories.has(categoryId)) {
			collapsedSubCategories.delete(categoryId);
		} else {
			collapsedSubCategories.add(categoryId);
		}
		collapsedSubCategories = new Set(collapsedSubCategories);
	}

	const tabs: { id: TabId; label: string; icon: typeof Tag }[] = [
		{ id: 'categories', label: 'Categorias', icon: Tag },
		{ id: 'subcategories', label: 'Subcategorias', icon: Layers },
		{ id: 'currencies', label: 'Moedas', icon: Coins }
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
			deleteError = '';
			await loadCategories();
		} catch (e: any) {
			deleteError = e.message || 'Erro ao excluir';
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
		subNature = CATEGORY_NATURE_ORDER[0];
		subCategoryId = filteredCategories.length > 0 ? filteredCategories[0].id : '';
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
		const cat = categories.find((c) => c.id === subcategory.category_id);
		subNature = cat?.nature ?? CATEGORY_NATURE_ORDER[0];
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
			subDeleteError = '';
			await loadSubcategories();
		} catch (e: any) {
			subDeleteError = e.message || 'Erro ao excluir';
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
			curDeleteError = '';
			await loadCurrencies();
		} catch (e: any) {
			curDeleteError = e.message || 'Erro ao excluir';
		}
	}
</script>

<div class="px-4 md:px-6 py-5 space-y-5">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-bold text-text-primary">Dados</h1>
			<p class="text-sm text-muted mt-0.5">Gerencie categorias, subcategorias e moedas</p>
		</div>
		{#if activeTab === 'categories'}
			<button
				onclick={openCreate}
				class="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98] flex items-center gap-1.5"
			>
				<Plus class="w-4 h-4" />
				Nova categoria
			</button>
		{:else if activeTab === 'subcategories'}
			<button
				onclick={openSubCreate}
				class="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98] flex items-center gap-1.5"
			>
				<Plus class="w-4 h-4" />
				Nova subcategoria
			</button>
		{:else if activeTab === 'currencies'}
			<button
				onclick={openCurCreate}
				class="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98] flex items-center gap-1.5"
			>
				<Plus class="w-4 h-4" />
				Nova moeda
			</button>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="flex gap-1 bg-surface border border-border/50 rounded-xl p-1">
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
				class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {activeTab === tab.id ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted hover:text-text-primary hover:bg-surface-2/60'}"
			>
				<tab.icon class="w-3.5 h-3.5" />
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Categories Tab -->
	{#if activeTab === 'categories'}
		{#if loading}
			<div class="text-muted text-sm animate-fade-in">Carregando...</div>
		{:else if categories.length === 0}
			<div class="bg-surface border border-border/50 rounded-xl p-10 text-center animate-fade-up">
				<div class="text-3xl mb-3 opacity-30">🏷️</div>
				<p class="text-sm text-muted font-medium">Nenhuma categoria cadastrada</p>
				<p class="text-xs text-text-secondary mt-1">Clique em "+ Nova categoria" para começar</p>
			</div>
		{:else}
			{#each groupByNature() as group (group.nature)}
				<div class="space-y-3 animate-fade-up">
					<div class="flex items-center gap-2.5 px-1">
						<div
							class="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
							style="background: linear-gradient(135deg, {CATEGORY_NATURE_COLORS[group.nature]}18 0%, {CATEGORY_NATURE_COLORS[group.nature]}30 100%); color: {CATEGORY_NATURE_COLORS[group.nature]}"
						>
							{CATEGORY_NATURE_ICONS[group.nature]}
						</div>
						<h2 class="text-sm font-semibold text-muted uppercase tracking-wider">{CATEGORY_NATURE_LABELS[group.nature]}</h2>
						<span class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-data">{group.categories.length}</span>
					</div>
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
						{#each group.categories as category (category.id)}
							<div
								class="bg-surface border border-border/50 rounded-xl p-4 hover:border-[{CATEGORY_NATURE_COLORS[category.nature]}]/30 hover:bg-[{CATEGORY_NATURE_COLORS[category.nature]}]/[0.02] hover:scale-[1.01] transition-all duration-200 group"
							>
								<div class="flex items-center gap-3 mb-3">
									<div
										class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-transform duration-200 group-hover:scale-110"
										style="background: linear-gradient(135deg, {CATEGORY_NATURE_COLORS[category.nature]}18 0%, {CATEGORY_NATURE_COLORS[category.nature]}35 100%); color: {CATEGORY_NATURE_COLORS[category.nature]}; box-shadow: 0 0 16px {CATEGORY_NATURE_COLORS[category.nature]}15"
									>
										{category.label.charAt(0).toUpperCase()}
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-text-primary font-semibold text-sm truncate">{category.label}</p>
										<span
											class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
											style="background-color: {CATEGORY_NATURE_COLORS[category.nature]}12; color: {CATEGORY_NATURE_COLORS[category.nature]}"
										>
											<span class="w-1.5 h-1.5 rounded-full inline-block" style="background-color: {CATEGORY_NATURE_COLORS[category.nature]}"></span>
											{CATEGORY_NATURE_LABELS[category.nature]}
										</span>
									</div>
									<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
										<button
											onclick={() => openEdit(category)}
											class="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-text-primary hover:bg-surface-2 transition-all duration-200 active:scale-90"
											title="Editar"
										>
											<Pencil class="w-3.5 h-3.5" />
										</button>
										<button
											onclick={() => deletingId = category.id}
											class="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200 active:scale-90"
											title="Excluir"
										>
											<Trash2 class="w-3.5 h-3.5" />
										</button>
									</div>
								</div>
								<div class="space-y-1.5 pt-2 border-t border-border/30">
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
			<div class="bg-surface border border-border/50 rounded-xl p-10 text-center animate-fade-up">
				<div class="text-3xl mb-3 opacity-30">📂</div>
				<p class="text-sm text-muted font-medium">Nenhuma subcategoria cadastrada</p>
				<p class="text-xs text-text-secondary mt-1">Clique em "+ Nova subcategoria" para começar</p>
			</div>
		{:else}
			{#each groupByCategory() as group (group.category.id)}
				<div class="bg-surface border border-border/50 rounded-xl overflow-hidden animate-fade-up">
					<button
						onclick={() => toggleSubCategoryGroup(group.category.id)}
						class="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-2/40 transition-all duration-200 text-left group"
					>
						<div class="flex items-center gap-3">
							<div
								class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-transform duration-200 group-hover:scale-110"
								style="background: linear-gradient(135deg, {CATEGORY_NATURE_COLORS[group.category.nature]}18 0%, {CATEGORY_NATURE_COLORS[group.category.nature]}35 100%); color: {CATEGORY_NATURE_COLORS[group.category.nature]}"
							>
								{group.category.label.charAt(0).toUpperCase()}
							</div>
							<div>
								<p class="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">{group.category.label}</p>
								<p class="text-[11px] text-muted flex items-center gap-1.5">
									<span
										class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
										style="background-color: {CATEGORY_NATURE_COLORS[group.category.nature]}12; color: {CATEGORY_NATURE_COLORS[group.category.nature]}"
									>
										<span class="w-1.5 h-1.5 rounded-full inline-block" style="background-color: {CATEGORY_NATURE_COLORS[group.category.nature]}"></span>
										{CATEGORY_NATURE_LABELS[group.category.nature]}
									</span>
								</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-data">{group.subcategories.length}</span>
							<ChevronDown class="w-4 h-4 text-muted transition-transform duration-200 {collapsedSubCategories.has(group.category.id) ? '-rotate-90' : ''}" />
						</div>
					</button>
					{#if !collapsedSubCategories.has(group.category.id)}
						<div class="border-t border-border/50">
							<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
								{#each group.subcategories as sub (sub.id)}
									<div
										class="bg-surface-2/40 border border-border/50 rounded-xl p-3.5 hover:border-primary/20 hover:bg-surface-2/60 transition-all duration-200 group/sub"
									>
										<div class="flex items-center justify-between mb-2">
											<p class="text-text-primary font-medium text-sm truncate">{sub.label}</p>
											<div class="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity duration-200">
												<button
													onclick={() => openSubEdit(sub)}
													class="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-text-primary hover:bg-surface-2 transition-all duration-200 active:scale-90"
													title="Editar"
												>
													<Pencil class="w-3 h-3" />
												</button>
												<button
													onclick={() => subDeletingId = sub.id}
													class="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200 active:scale-90"
													title="Excluir"
												>
													<Trash2 class="w-3 h-3" />
												</button>
											</div>
										</div>
										<div class="flex items-center justify-between">
											<button
												onclick={() => toggleSubActive(sub)}
												class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors {sub.is_active ? 'bg-[#22c55e]/12 text-[#22c55e] hover:bg-[#22c55e]/20' : 'bg-[#ef4444]/12 text-[#ef4444] hover:bg-[#ef4444]/20'}"
											>
												<span class="w-1.5 h-1.5 rounded-full inline-block" style="background-color: {sub.is_active ? '#22c55e' : '#ef4444'}"></span>
												{sub.is_active ? 'Ativo' : 'Inativo'}
											</button>
											<span class="text-[10px] text-text-secondary font-data">{formatDate(sub.created_at)}</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	{:else if activeTab === 'currencies'}
		{#if loading}
			<div class="text-muted text-sm animate-fade-in">Carregando...</div>
		{:else if currencies.length === 0}
			<div class="bg-surface border border-border/50 rounded-xl p-10 text-center animate-fade-up">
				<div class="text-3xl mb-3 opacity-30">💱</div>
				<p class="text-sm text-muted font-medium">Nenhuma moeda cadastrada</p>
				<p class="text-xs text-text-secondary mt-1">Clique em "+ Nova moeda" para começar</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 animate-stagger">
				{#each currencies as currency (currency.id)}
					<div
						class="bg-surface border border-border/50 rounded-xl p-4 hover:border-primary/20 hover:bg-primary/[0.02] hover:scale-[1.01] transition-all duration-200 group"
					>
						<div class="flex items-center gap-3 mb-3">
							<div
								class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-transform duration-200 group-hover:scale-110"
								style="background: linear-gradient(135deg, #2563eb18 0%, #2563eb35 100%); color: #2563eb; box-shadow: 0 0 16px #2563eb15"
							>
								{currency.symbol}
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-text-primary font-semibold text-sm truncate">{currency.label}</p>
								<p class="text-[11px] text-muted">{currency.symbol}</p>
							</div>
							<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
								<button
									onclick={() => openCurEdit(currency)}
									class="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-text-primary hover:bg-surface-2 transition-all duration-200 active:scale-90"
									title="Editar"
								>
									<Pencil class="w-3.5 h-3.5" />
								</button>
								<button
									onclick={() => curDeletingId = currency.id}
									class="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200 active:scale-90"
									title="Excluir"
								>
									<Trash2 class="w-3.5 h-3.5" />
								</button>
							</div>
						</div>
						<div class="space-y-1.5 pt-2 border-t border-border/30">
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

<!-- Create/Edit Category Modal -->
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
					<label for="cat-label" class="block text-xs text-muted mb-1.5">Nome da categoria</label>
					<input
						id="cat-label"
						type="text"
						bind:value={label}
						required
						minlength={1}
						class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
						placeholder="Alimentação"
					/>
				</div>

				<div>
					<label for="cat-nature" class="block text-xs text-muted mb-1.5">Natureza</label>
					<select
						id="cat-nature"
						bind:value={nature}
						class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
					>
						{#each Object.entries(CATEGORY_NATURE_LABELS) as [value, label_str]}
							<option value={value}>{label_str}</option>
						{/each}
					</select>
				</div>

				<div class="flex gap-3 pt-2">
					<button
						type="submit"
						class="flex-1 bg-primary hover:bg-primary-hover text-white rounded-lg py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]"
					>
						{editingId ? 'Salvar' : 'Criar'}
					</button>
					<button
						type="button"
						onclick={() => { showForm = false; resetForm(); }}
						class="flex-1 text-muted hover:text-text-primary border border-border/70 rounded-lg py-2.5 text-sm transition-all duration-200"
					>
						Cancelar
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Category Confirmation Modal -->
{#if deletingId}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => { deletingId = null; deleteError = ''; }} onkeydown={(e) => { if (e.key === 'Escape') { deletingId = null; deleteError = ''; } }} role="presentation">
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
		<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<h2 class="text-lg font-bold text-text-primary mb-2">Excluir categoria</h2>
			<p class="text-muted text-sm mb-6">Tem certeza? Esta ação não pode ser desfeita.</p>

			{#if deleteError}
				<div class="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 mb-4 text-sm">
					{deleteError}
				</div>
			{/if}

			<div class="flex gap-3">
				<button
					onclick={() => handleDelete(deletingId!)}
					class="flex-1 bg-danger/15 text-danger border border-danger/30 rounded-lg py-2.5 text-sm font-medium hover:bg-danger/25 transition-all duration-200 active:scale-[0.98]"
				>
					Excluir
				</button>
				<button
					onclick={() => { deletingId = null; deleteError = ''; }}
					class="flex-1 text-muted hover:text-text-primary border border-border/70 rounded-lg py-2.5 text-sm transition-all duration-200"
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
					<label for="sub-label" class="block text-xs text-muted mb-1.5">Nome da subcategoria</label>
					<input
						id="sub-label"
						type="text"
						bind:value={subLabel}
						required
						minlength={1}
						class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
						placeholder="Ex: Supermercado"
					/>
				</div>

				<div>
					<label for="sub-nature" class="block text-xs text-muted mb-1.5">Natureza</label>
					<select
						id="sub-nature"
						bind:value={subNature}
						onchange={() => { subCategoryId = filteredCategories.length > 0 ? filteredCategories[0].id : ''; }}
						class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
					>
						{#each Object.entries(CATEGORY_NATURE_LABELS) as [value, label_str]}
							<option value={value}>{label_str}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="sub-category" class="block text-xs text-muted mb-1.5">Categoria</label>
					<select
						id="sub-category"
						bind:value={subCategoryId}
						class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
					>
						{#each filteredCategories as cat}
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
						class="flex-1 bg-primary hover:bg-primary-hover text-white rounded-lg py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]"
					>
						{subEditingId ? 'Salvar' : 'Criar'}
					</button>
					<button
						type="button"
						onclick={() => { showSubForm = false; resetSubForm(); }}
						class="flex-1 text-muted hover:text-text-primary border border-border/70 rounded-lg py-2.5 text-sm transition-all duration-200"
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
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => { subDeletingId = null; subDeleteError = ''; }} onkeydown={(e) => { if (e.key === 'Escape') { subDeletingId = null; subDeleteError = ''; } }} role="presentation">
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
		<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<h2 class="text-lg font-bold text-text-primary mb-2">Excluir subcategoria</h2>
			<p class="text-muted text-sm mb-6">Tem certeza? Esta ação não pode ser desfeita.</p>

			{#if subDeleteError}
				<div class="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 mb-4 text-sm">
					{subDeleteError}
				</div>
			{/if}

			<div class="flex gap-3">
				<button
					onclick={() => handleSubDelete(subDeletingId!)}
					class="flex-1 bg-danger/15 text-danger border border-danger/30 rounded-lg py-2.5 text-sm font-medium hover:bg-danger/25 transition-all duration-200 active:scale-[0.98]"
				>
					Excluir
				</button>
				<button
					onclick={() => { subDeletingId = null; subDeleteError = ''; }}
					class="flex-1 text-muted hover:text-text-primary border border-border/70 rounded-lg py-2.5 text-sm transition-all duration-200"
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
					<label for="cur-label" class="block text-xs text-muted mb-1.5">Nome da moeda</label>
					<input
						id="cur-label"
						type="text"
						bind:value={curLabel}
						required
						minlength={1}
						class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
						placeholder="Real Brasileiro"
					/>
				</div>

				<div>
					<label for="cur-symbol" class="block text-xs text-muted mb-1.5">Símbolo</label>
					<input
						id="cur-symbol"
						type="text"
						bind:value={curSymbol}
						required
						minlength={1}
						class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
						placeholder="R$"
					/>
				</div>

				<div class="flex gap-3 pt-2">
					<button
						type="submit"
						class="flex-1 bg-primary hover:bg-primary-hover text-white rounded-lg py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]"
					>
						{curEditingId ? 'Salvar' : 'Criar'}
					</button>
					<button
						type="button"
						onclick={() => { showCurForm = false; resetCurForm(); }}
						class="flex-1 text-muted hover:text-text-primary border border-border/70 rounded-lg py-2.5 text-sm transition-all duration-200"
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
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => { curDeletingId = null; curDeleteError = ''; }} onkeydown={(e) => { if (e.key === 'Escape') { curDeletingId = null; curDeleteError = ''; } }} role="presentation">
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
		<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<h2 class="text-lg font-bold text-text-primary mb-2">Excluir moeda</h2>
			<p class="text-muted text-sm mb-6">Tem certeza? Esta ação não pode ser desfeita.</p>

			{#if curDeleteError}
				<div class="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 mb-4 text-sm">
					{curDeleteError}
				</div>
			{/if}

			<div class="flex gap-3">
				<button
					onclick={() => handleCurDelete(curDeletingId!)}
					class="flex-1 bg-danger/15 text-danger border border-danger/30 rounded-lg py-2.5 text-sm font-medium hover:bg-danger/25 transition-all duration-200 active:scale-[0.98]"
				>
					Excluir
				</button>
				<button
					onclick={() => { curDeletingId = null; curDeleteError = ''; }}
					class="flex-1 text-muted hover:text-text-primary border border-border/70 rounded-lg py-2.5 text-sm transition-all duration-200"
				>
					Cancelar
				</button>
			</div>
		</div>
	</div>
{/if}