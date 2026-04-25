<script lang="ts">
	import {
		getTransactions,
		createTransaction,
		updateTransaction,
		deleteTransaction,
		getAccounts,
		getCategories,
		getSubcategories,
		getCurrencies,
		getCreditCards
	} from '$lib/api';
import type { Transaction, TransactionCreate, TransactionUpdate, TransactionType, PaymentMethod } from '$lib/types/transaction';
import type { Account } from '$lib/types/account';
import type { Category, CategoryNature } from '$lib/types/category';
	import type { Subcategory } from '$lib/types/subcategory';
	import type { Currency } from '$lib/types/currency';
	import type { CreditCard } from '$lib/types/credit_card';
	import {
		TRANSACTION_TYPE_LABELS,
		TRANSACTION_TYPE_COLORS,
		PAYMENT_METHOD_LABELS
	} from '$lib/types/transaction';
	import { CATEGORY_NATURE_LABELS, CATEGORY_NATURE_COLORS } from '$lib/types/category';
	import { onMount } from 'svelte';
	import { TrendingUp, TrendingDown, Wallet, Search, X, Plus } from 'lucide-svelte';

	let transactions = $state<Transaction[]>([]);
	let accounts = $state<Account[]>([]);
	let categories = $state<Category[]>([]);
	let subcategories = $state<Subcategory[]>([]);
	let currencies = $state<Currency[]>([]);
	let creditCards = $state<CreditCard[]>([]);
	let loading = $state(true);

	// Filters
	let filterType = $state<'all' | TransactionType>('all');
	let filterAccountId = $state<string>('');
	let filterCategoryId = $state<string>('');
	let filterSubcategoryId = $state<string>('');
	let filterDateFrom = $state<string>('');
	let filterDateTo = $state<string>('');
	let searchQuery = $state('');

	// Modal state
	let showForm = $state(false);
	let editingId = $state<string | null>(null);
	let formError = $state('');
	let deletingId = $state<string | null>(null);

	// Form fields
	let formDate = $state('');
	let formType = $state<TransactionType>('outcome');
	let formCategoryId = $state('');
	let formSubcategoryId = $state('');
	let formAccountId = $state('');
	let formCurrencyId = $state('');
	let formDescription = $state('');
	let formAmount = $state('');
	let formPaymentMethod = $state<PaymentMethod | ''>('');
	let formCreditCardId = $state('');
	let formStatementId = $state('');

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		try {
			const [txs, accts, cats, subcats, curs, cards] = await Promise.all([
				getTransactions(),
				getAccounts(),
				getCategories(),
				getSubcategories(),
				getCurrencies(),
				getCreditCards()
			]);
			transactions = txs;
			accounts = accts;
			categories = cats;
			subcategories = subcats;
			currencies = curs;
			creditCards = cards;
		} catch (e: any) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		const now = new Date();
		const offset = now.getTimezoneOffset();
		const local = new Date(now.getTime() - offset * 60000);
		formDate = local.toISOString().slice(0, 16);
		formType = 'outcome';
		formCategoryId = '';
		formSubcategoryId = '';
		formAccountId = accounts.length > 0 ? accounts[0].id : '';
		formCurrencyId = currencies.length > 0 ? currencies[0].id : '';
		formDescription = '';
		formAmount = '';
		formPaymentMethod = '';
		formCreditCardId = '';
		formStatementId = '';
		formError = '';
		editingId = null;
	}

	function openCreate() {
		resetForm();
		showForm = true;
	}

	function openEdit(tx: Transaction) {
		formDate = tx.date_transaction.slice(0, 16);
		formType = tx.type;
		const sub = subcategories.find(s => s.id === tx.subcategory_id);
		formCategoryId = sub?.category_id || '';
		formSubcategoryId = tx.subcategory_id;
		formAccountId = tx.account_id;
		formCurrencyId = tx.currency_id;
		formDescription = tx.description || '';
		formAmount = String(tx.amount);
		formPaymentMethod = tx.payment_methods || '';
		formStatementId = tx.statement_id || '';
		editingId = tx.id;
		showForm = true;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		formError = '';

		const amount = Number(formAmount);
		if (isNaN(amount) || amount <= 0) {
			formError = 'Valor deve ser maior que zero';
			return;
		}
		if (!formSubcategoryId) {
			formError = 'Selecione uma subcategoria';
			return;
		}

		const data: TransactionCreate = {
			date_transaction: formDate + ':00',
			type: formType,
			subcategory_id: formSubcategoryId,
			account_id: formAccountId,
			currency_id: formCurrencyId,
			description: formDescription || null,
			amount: amount,
			payment_methods: formPaymentMethod || null,
			statement_id: formStatementId || null,
			credit_card_id: formPaymentMethod === 'credit' ? (formCreditCardId || null) : null,
		};

		try {
			if (editingId) {
				await updateTransaction(editingId, data as TransactionUpdate);
			} else {
				await createTransaction(data);
			}
			showForm = false;
			resetForm();
			await loadData();
		} catch (e: any) {
			formError = e.message || 'Erro ao salvar';
		}
	}

	async function handleDelete(id: string) {
		try {
			await deleteTransaction(id);
			deletingId = null;
			await loadData();
		} catch (e: any) {
			console.error(e);
		}
	}

	function getAccountName(accountId: string): string {
		return accounts.find(a => a.id === accountId)?.label || '—';
	}

	function getSubcategoryName(subcategoryId: string): string {
		const sub = subcategories.find(s => s.id === subcategoryId);
		if (!sub) return '—';
		const cat = categories.find(c => c.id === sub.category_id);
		return cat ? `${cat.label} › ${sub.label}` : sub.label;
	}

	function getSubcategoryNature(subcategoryId: string): CategoryNature | null {
		const sub = subcategories.find(s => s.id === subcategoryId);
		if (!sub) return null;
		const cat = categories.find(c => c.id === sub.category_id);
		return cat?.nature ?? null;
	}

	function getCurrencySymbol(currencyId: string): string {
		return currencies.find(c => c.id === currencyId)?.symbol || 'R$';
	}

	function formatDate(iso: string): string {
		const tz = localStorage.getItem('timezone') || 'America/Sao_Paulo';
		return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: tz });
	}

	function formatCurrency(value: number, currencyId: string): string {
		const symbol = getCurrencySymbol(currencyId);
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
	}

	// Filtered transactions
	let filteredTransactions = $derived.by(() => {
		let result = transactions;
		if (filterType !== 'all') {
			result = result.filter(t => t.type === filterType);
		}
		if (filterAccountId) {
			result = result.filter(t => t.account_id === filterAccountId);
		}
		if (filterCategoryId) {
			result = result.filter(t => {
				const sub = subcategories.find(s => s.id === t.subcategory_id);
				return sub?.category_id === filterCategoryId;
			});
		}
		if (filterSubcategoryId) {
			result = result.filter(t => t.subcategory_id === filterSubcategoryId);
		}
		if (filterDateFrom) {
			const from = new Date(filterDateFrom + 'T00:00:00');
			result = result.filter(t => new Date(t.date_transaction) >= from);
		}
		if (filterDateTo) {
			const to = new Date(filterDateTo + 'T23:59:59');
			result = result.filter(t => new Date(t.date_transaction) <= to);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(t =>
				(t.description || '').toLowerCase().includes(q) ||
				getAccountName(t.account_id).toLowerCase().includes(q) ||
				getSubcategoryName(t.subcategory_id).toLowerCase().includes(q)
			);
		}
		// Sort by date descending
		return result.toSorted((a, b) => new Date(b.date_transaction).getTime() - new Date(a.date_transaction).getTime());
	});

	let hasActiveFilters = $derived(filterType !== 'all' || !!filterAccountId || !!filterCategoryId || !!filterSubcategoryId || !!filterDateFrom || !!filterDateTo || !!searchQuery.trim());

	function clearFilters() {
		filterType = 'all';
		filterAccountId = '';
		filterCategoryId = '';
		filterSubcategoryId = '';
		filterDateFrom = '';
		filterDateTo = '';
		searchQuery = '';
	}

	// Totals
	let totalIncome = $derived(filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
	let totalOutcome = $derived(filteredTransactions.filter(t => t.type === 'outcome').reduce((s, t) => s + t.amount, 0));
	let netBalance = $derived(totalIncome - totalOutcome);
</script>

<div class="px-4 md:px-6 py-5 space-y-5">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-bold text-text-primary">Lançamentos</h1>
			<p class="text-sm text-muted mt-0.5">Gerencie suas transações financeiras</p>
			{#if !loading}
				<p class="text-[10px] text-text-secondary font-data mt-0.5">{transactions.length} transação{(transactions.length) !== 1 ? 'ões' : ''} no total</p>
			{/if}
		</div>
		<button
			onclick={openCreate}
			class="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98] flex items-center gap-1.5"
		>
			<Plus class="w-4 h-4" />
			Novo lançamento
		</button>
	</div>

	<!-- Summary cards -->
	<div class="grid grid-cols-3 gap-3 animate-stagger">
		<div class="bg-surface border border-border/50 rounded-xl p-4 hover:border-[#22c55e]/30 hover:bg-[#22c55e]/[0.02] transition-all duration-200 group">
			<div class="flex items-center justify-between mb-2">
				<p class="text-[10px] font-semibold text-muted uppercase tracking-widest">Entradas</p>
				<div class="w-8 h-8 rounded-lg flex items-center justify-center bg-[#22c55e]/10 text-[#22c55e] group-hover:scale-110 transition-transform duration-200">
					<TrendingUp class="w-4 h-4" />
				</div>
			</div>
			<p class="text-lg font-data font-semibold" style="color: #22c55e">{formatCurrency(totalIncome, '')}</p>
			<p class="text-[10px] text-text-secondary mt-0.5">
				{filteredTransactions.filter(t => t.type === 'income').length} transação{(filteredTransactions.filter(t => t.type === 'income').length) !== 1 ? 'ões' : ''}
			</p>
		</div>
		<div class="bg-surface border border-border/50 rounded-xl p-4 hover:border-[#ef4444]/30 hover:bg-[#ef4444]/[0.02] transition-all duration-200 group">
			<div class="flex items-center justify-between mb-2">
				<p class="text-[10px] font-semibold text-muted uppercase tracking-widest">Saídas</p>
				<div class="w-8 h-8 rounded-lg flex items-center justify-center bg-[#ef4444]/10 text-[#ef4444] group-hover:scale-110 transition-transform duration-200">
					<TrendingDown class="w-4 h-4" />
				</div>
			</div>
			<p class="text-lg font-data font-semibold" style="color: #ef4444">{formatCurrency(totalOutcome, '')}</p>
			<p class="text-[10px] text-text-secondary mt-0.5">
				{filteredTransactions.filter(t => t.type === 'outcome').length} transação{(filteredTransactions.filter(t => t.type === 'outcome').length) !== 1 ? 'ões' : ''}
			</p>
		</div>
		<div class="bg-surface border border-border/50 rounded-xl p-4 hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-200 group">
			<div class="flex items-center justify-between mb-2">
				<p class="text-[10px] font-semibold text-muted uppercase tracking-widest">Saldo</p>
				<div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-200">
					<Wallet class="w-4 h-4" />
				</div>
			</div>
			<p class="text-lg font-data font-semibold" style="color: {netBalance >= 0 ? '#22c55e' : '#ef4444'}">
				{netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance, '')}
			</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="bg-surface border border-border/50 rounded-xl overflow-hidden animate-fade-up">
		<div class="flex items-center justify-between px-4 py-3 border-b border-border/50">
			<div class="flex items-center gap-2">
				<Search class="w-3.5 h-3.5 text-muted" />
				<span class="text-[10px] font-semibold text-muted uppercase tracking-wider">Filtros</span>
				{#if hasActiveFilters}
					<span class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-data">{filteredTransactions.length} resultado{(filteredTransactions.length) !== 1 ? 's' : ''}</span>
				{/if}
			</div>
			{#if hasActiveFilters}
				<button
					onclick={clearFilters}
					class="text-[10px] text-muted hover:text-danger hover:bg-danger/10 px-2 py-1 rounded-lg transition-all duration-200 flex items-center gap-1"
				>
					<X class="w-3 h-3" />
					Limpar filtros
				</button>
			{/if}
		</div>
		<div class="p-4 space-y-3">
			<div class="flex flex-wrap gap-2.5">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Buscar por descrição, conta, categoria..."
					class="flex-1 min-w-[220px] bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
				/>
				<select
					bind:value={filterType}
					class="bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
				>
					<option value="all">Todos os tipos</option>
					<option value="income">Entradas</option>
					<option value="outcome">Saídas</option>
				</select>
				<select
					bind:value={filterAccountId}
					class="bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
				>
					<option value="">Todas as contas</option>
					{#each accounts as acct}
						<option value={acct.id}>{acct.label}</option>
					{/each}
				</select>
			</div>
			<div class="flex flex-wrap gap-2.5">
				<select
					bind:value={filterCategoryId}
					onchange={() => { filterSubcategoryId = ''; }}
					class="bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
				>
					<option value="">Todas as categorias</option>
					{#each categories as cat}
						<option value={cat.id}>{cat.label}</option>
					{/each}
				</select>
				<select
					bind:value={filterSubcategoryId}
					class="bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
				>
					<option value="">Todas as subcategorias</option>
					{#each (filterCategoryId ? subcategories.filter(s => s.category_id === filterCategoryId) : subcategories) as sub}
						<option value={sub.id}>{sub.label}</option>
					{/each}
				</select>
				<input
					type="date"
					bind:value={filterDateFrom}
					class="bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all [color-scheme:dark]"
				/>
				<input
					type="date"
					bind:value={filterDateTo}
					class="bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all [color-scheme:dark]"
				/>
			</div>
		</div>
	</div>

	<!-- Transactions list -->
	{#if loading}
		<div class="text-muted text-sm animate-fade-in">Carregando...</div>
	{:else if filteredTransactions.length === 0}
		<div class="bg-surface border border-border/50 rounded-xl p-10 text-center animate-fade-up">
			<div class="text-3xl mb-3 opacity-30">{hasActiveFilters ? '🔍' : '📋'}</div>
			<p class="text-sm text-muted font-medium">{hasActiveFilters ? 'Nenhum lançamento encontrado' : 'Nenhum lançamento registrado'}</p>
			{#if !hasActiveFilters}
				<p class="text-xs text-text-secondary mt-1">Clique em "+ Novo lançamento" para começar</p>
			{:else}
				<button onclick={clearFilters} class="text-xs text-primary hover:text-primary-hover mt-2 transition-colors">Limpar filtros</button>
			{/if}
		</div>
	{:else}
		<div class="bg-surface border border-border/50 rounded-xl overflow-hidden animate-fade-up">
			<!-- Desktop table -->
			<div class="hidden md:block overflow-x-auto">
				<table class="sheet-table">
					<thead>
						<tr>
							<th class="text-center">Data</th>
							<th class="text-center">Tipo</th>
							<th class="text-center">Descrição</th>
							<th class="text-center">Categoria</th>
							<th class="text-center">Conta</th>
							<th class="text-center">Pagamento</th>
							<th class="text-center">Valor</th>
							<th class="text-center w-20"></th>
						</tr>
					</thead>
					<tbody>
						{#each filteredTransactions as tx, i (tx.id)}
							{@const isIncome = tx.type === 'income'}
							<tr class="transition-all duration-150 hover:bg-surface-2/40 {i % 2 === 0 ? 'bg-transparent' : 'bg-surface-2/20'}">
								<td class="font-data whitespace-nowrap text-xs text-muted text-center">{formatDate(tx.date_transaction)}</td>
								<td class="text-center">
									<span
										class="text-[10px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
										style="background-color: {TRANSACTION_TYPE_COLORS[tx.type]}12; color: {TRANSACTION_TYPE_COLORS[tx.type]}"
									>
										<span class="w-1.5 h-1.5 rounded-full inline-block" style="background-color: {TRANSACTION_TYPE_COLORS[tx.type]}"></span>
										{TRANSACTION_TYPE_LABELS[tx.type]}
									</span>
								</td>
								<td class="max-w-[200px] truncate text-sm text-text-primary text-center">{tx.description || '—'}</td>
								<td class="text-center">
									{#if getSubcategoryNature(tx.subcategory_id)}
										<span
											class="text-[10px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
											style="background-color: {CATEGORY_NATURE_COLORS[getSubcategoryNature(tx.subcategory_id) as CategoryNature]}12; color: {CATEGORY_NATURE_COLORS[getSubcategoryNature(tx.subcategory_id) as CategoryNature]}"
										>
											<span class="w-1.5 h-1.5 rounded-full inline-block" style="background-color: {CATEGORY_NATURE_COLORS[getSubcategoryNature(tx.subcategory_id) as CategoryNature]}"></span>
											{getSubcategoryName(tx.subcategory_id)}
										</span>
									{:else}
										<span class="text-xs text-muted">{getSubcategoryName(tx.subcategory_id)}</span>
									{/if}
								</td>
								<td class="text-xs text-text-secondary text-center">{getAccountName(tx.account_id)}</td>
								<td class="text-center">
									{#if tx.payment_methods}
										<span
											class="text-[10px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
											style="background-color: {tx.payment_methods === 'credit' ? '#a855f712' : tx.payment_methods === 'debit' ? '#f9731612' : '#3b82f612'}; color: {tx.payment_methods === 'credit' ? '#a855f7' : tx.payment_methods === 'debit' ? '#f97316' : '#3b82f6'}"
										>
											<span class="w-1.5 h-1.5 rounded-full inline-block" style="background-color: {tx.payment_methods === 'credit' ? '#a855f7' : tx.payment_methods === 'debit' ? '#f97316' : '#3b82f6'}"></span>
											{PAYMENT_METHOD_LABELS[tx.payment_methods]}
										</span>
									{:else}
										<span class="text-muted text-[10px]">—</span>
									{/if}
								</td>
								<td class="font-data whitespace-nowrap font-semibold text-center" style="color: {isIncome ? '#22c55e' : '#ef4444'}">
									<span class="text-[10px] opacity-60">{isIncome ? '+' : '−'}</span>{formatCurrency(tx.amount, tx.currency_id)}
								</td>
								<td class="text-center">
									<div class="flex items-center justify-center gap-1">
										<button
											onclick={() => openEdit(tx)}
											class="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-text-primary hover:bg-surface-2 transition-all duration-200 text-xs active:scale-90"
											title="Editar"
										>
											✏️
										</button>
										<button
											onclick={() => deletingId = tx.id}
											class="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200 text-xs active:scale-90"
											title="Excluir"
										>
											🗑️
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile cards -->
			<div class="md:hidden divide-y divide-border/50">
				{#each filteredTransactions as tx (tx.id)}
					{@const isIncome = tx.type === 'income'}
					<div class="p-3.5 flex items-start gap-3 {isIncome ? 'bg-[#22c55e]/[0.01]' : 'bg-[#ef4444]/[0.01]'}">
						<div
							class="w-1 self-stretch shrink-0 rounded-full"
							style="background-color: {isIncome ? '#22c55e' : '#ef4444'}"
						></div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center justify-between gap-2">
								<p class="text-sm font-medium text-text-primary truncate">{tx.description || 'Sem descrição'}</p>
								<p class="text-sm font-data font-semibold shrink-0" style="color: {isIncome ? '#22c55e' : '#ef4444'}">
									{isIncome ? '+' : '−'}{formatCurrency(tx.amount, tx.currency_id)}
								</p>
							</div>
							<div class="flex flex-wrap items-center gap-1.5 mt-1.5">
								<span class="text-[10px] text-muted">{formatDate(tx.date_transaction)}</span>
								<span
									class="text-[10px] font-semibold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1"
									style="background-color: {TRANSACTION_TYPE_COLORS[tx.type]}12; color: {TRANSACTION_TYPE_COLORS[tx.type]}"
								>
									<span class="w-1.5 h-1.5 rounded-full inline-block" style="background-color: {TRANSACTION_TYPE_COLORS[tx.type]}"></span>
									{TRANSACTION_TYPE_LABELS[tx.type]}
								</span>
								<span class="text-[10px] text-muted">{getAccountName(tx.account_id)}</span>
								{#if tx.payment_methods}
									<span
										class="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
										style="background-color: {tx.payment_methods === 'credit' ? '#a855f712' : tx.payment_methods === 'debit' ? '#f9731612' : '#3b82f612'}; color: {tx.payment_methods === 'credit' ? '#a855f7' : tx.payment_methods === 'debit' ? '#f97316' : '#3b82f6'}"
									>
										{PAYMENT_METHOD_LABELS[tx.payment_methods]}
									</span>
								{/if}
							</div>
						</div>
						<div class="flex items-center gap-1 shrink-0">
							<button onclick={() => openEdit(tx)} class="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-text-primary hover:bg-surface-2 transition-all duration-200 text-xs active:scale-90" title="Editar">✏️</button>
							<button onclick={() => deletingId = tx.id} class="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200 text-xs active:scale-90" title="Excluir">🗑️</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Create/Edit Modal -->
{#if showForm}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => { showForm = false; resetForm(); }} onkeydown={(e) => { if (e.key === 'Escape') { showForm = false; resetForm(); } }} role="presentation">
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
		<div class="relative bg-surface-2 border border-border rounded-2xl max-w-[500px] p-6 shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<h2 class="text-lg font-bold text-text-primary mb-4">
				{editingId ? 'Editar lançamento' : 'Novo lançamento'}
			</h2>

			{#if formError}
				<div class="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 mb-4 text-sm">
					{formError}
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-5">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="tx-type" class="block text-xs text-muted mb-1.5">Tipo</label>
						<select
							id="tx-type"
							bind:value={formType}
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
						>
							<option value="outcome">Saída</option>
							<option value="income">Entrada</option>
						</select>
					</div>
					<div>
						<label for="tx-amount" class="block text-xs text-muted mb-1.5">Valor</label>
						<input
							id="tx-amount"
							type="text"
							inputmode="decimal"
							bind:value={formAmount}
							required
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary font-data focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
						/>
					</div>
				</div>

				<div>
					<label for="tx-description" class="block text-xs text-muted mb-1.5">Descrição</label>
					<input
						id="tx-description"
						type="text"
						bind:value={formDescription}
						class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
						placeholder="Ex: Supermercado"
					/>
				</div>

				<div>
					<label for="tx-date" class="block text-xs text-muted mb-1.5">Data</label>
					<input
						id="tx-date"
						type="datetime-local"
						bind:value={formDate}
						required
						class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all [color-scheme:dark]"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="tx-category" class="block text-xs text-muted mb-1.5">Categoria</label>
						<select
							id="tx-category"
							bind:value={formCategoryId}
							onchange={() => { formSubcategoryId = ''; }}
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
						>
							<option value="">Selecione...</option>
							{#each categories as cat}
								<option value={cat.id}>{cat.label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="tx-subcategory" class="block text-xs text-muted mb-1.5">Subcategoria</label>
						<select
							id="tx-subcategory"
							bind:value={formSubcategoryId}
							required
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
						>
							<option value="">Selecione...</option>
							{#each (formCategoryId ? subcategories.filter(s => s.category_id === formCategoryId) : []) as sub}
								<option value={sub.id}>{sub.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="tx-account" class="block text-xs text-muted mb-1.5">Conta</label>
						<select
							id="tx-account"
							bind:value={formAccountId}
							required
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
						>
							{#each accounts as acct}
								<option value={acct.id}>{acct.label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="tx-currency" class="block text-xs text-muted mb-1.5">Moeda</label>
						<select
							id="tx-currency"
							bind:value={formCurrencyId}
							required
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
						>
							{#each currencies as cur}
								<option value={cur.id}>{cur.label} ({cur.symbol})</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label for="tx-payment" class="block text-xs text-muted mb-1.5">Método de pagamento</label>
					<select
						id="tx-payment"
						bind:value={formPaymentMethod}
						onchange={() => { if (formPaymentMethod !== 'credit') formCreditCardId = ''; }}
						class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
					>
						<option value="">Nenhum</option>
						<option value="pix">Pix</option>
						<option value="debit">Débito</option>
						<option value="credit">Crédito</option>
					</select>
				</div>

				{#if formPaymentMethod === 'credit'}
					<div>
						<label for="tx-card" class="block text-xs text-muted mb-1.5">Cartão</label>
						<select
							id="tx-card"
							bind:value={formCreditCardId}
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
						>
							<option value="">Selecione o cartão...</option>
							{#each creditCards.filter(c => c.account_id === formAccountId) as card}
								<option value={card.id}>{card.label}</option>
							{/each}
						</select>
					</div>
				{/if}

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

<!-- Delete Confirmation Modal -->
{#if deletingId}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => deletingId = null} onkeydown={(e) => { if (e.key === 'Escape') deletingId = null; }} role="presentation">
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
		<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<h2 class="text-lg font-bold text-text-primary mb-2">Excluir lançamento</h2>
			<p class="text-muted text-sm mb-6">Tem certeza? Esta ação não pode ser desfeita.</p>
			<div class="flex gap-3">
				<button
					onclick={() => handleDelete(deletingId!)}
					class="flex-1 bg-danger/15 text-danger border border-danger/30 rounded-lg py-2.5 text-sm font-medium hover:bg-danger/25 transition-all duration-200 active:scale-[0.98]"
				>
					Excluir
				</button>
				<button
					onclick={() => deletingId = null}
					class="flex-1 text-muted hover:text-text-primary border border-border/70 rounded-lg py-2.5 text-sm transition-all duration-200"
				>
					Cancelar
				</button>
			</div>
		</div>
	</div>
{/if}
