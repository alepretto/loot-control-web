<script lang="ts">
	import { getCategories, createCategory, updateCategory, deleteCategory } from '$lib/api';
	import {
		CATEGORY_NATURE_LABELS,
		CATEGORY_NATURE_COLORS,
		CATEGORY_NATURE_ICONS,
		CATEGORY_NATURE_ORDER,
		type Category,
		type CategoryNature
	} from '$lib/types/category';
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
		{/if}
	</div>

	<!-- Tabs -->
	<div class="flex gap-1 bg-surface border border-border rounded-lg p-1">
		{#each tabs as tab (tab.id)}
			<button
				onclick={() => { activeTab = tab.id; loading = true; if (tab.id === 'categories') loadCategories(); else loading = false; }}
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
		<div class="bg-surface border border-border rounded-xl p-8 text-center animate-fade-up">
			<p class="text-muted">Subcategorias em breve</p>
			<p class="text-text-secondary text-sm mt-1">Esta seção estará disponível em uma futura atualização.</p>
		</div>
	{:else if activeTab === 'currencies'}
		<div class="bg-surface border border-border rounded-xl p-8 text-center animate-fade-up">
			<p class="text-muted">Moedas em breve</p>
			<p class="text-text-secondary text-sm mt-1">Esta seção estará disponível em uma futura atualização.</p>
		</div>
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