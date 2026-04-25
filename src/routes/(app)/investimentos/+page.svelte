<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { ChartJS } from '$lib/chart';
	import {
		getPortfolio,
		getPortfolioTimeline,
		getAccounts,
		getCategories,
		getSubcategories,
		getCurrencies,
		createTransaction,
		createInvestment
	} from '$lib/api';
	import { TrendingDown, TrendingUp, Wallet, Plus, X } from 'lucide-svelte';
	import type { PortfolioSummary, TimelineEntry } from '$lib/types/investment';
	import type { Account } from '$lib/types/account';
	import type { Category } from '$lib/types/category';
	import type { Subcategory } from '$lib/types/subcategory';
	import type { Currency } from '$lib/types/currency';

	let portfolio = $state<PortfolioSummary | null>(null);
	let timeline = $state<TimelineEntry[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedCategory = $state<string | null>(null);
	let donutCanvas: HTMLCanvasElement | undefined = $state();
	let lineCanvas: HTMLCanvasElement | undefined = $state();
	let donutChart: import('chart.js').Chart<'doughnut'> | null = null;
	let lineChart: import('chart.js').Chart<'line'> | null = null;

	// Modal state
	let showModal = $state(false);
	let saving = $state(false);
	let formError = $state<string | null>(null);

	// Dropdown data
	let accounts = $state<Account[]>([]);
	let categories = $state<Category[]>([]);
	let subcategories = $state<Subcategory[]>([]);
	let currencies = $state<Currency[]>([]);

	// Form fields
	let formDate = $state(today());
	let formAmount = $state(0);
	let formDescription = $state('');
	let formAccountId = $state('');
	let formCategoryId = $state('');
	let formSubcategoryId = $state('');
	let formCurrencyId = $state('');
	let formSymbol = $state('');
	let formQuantity = $state(0);
	let formInvestCurrency = $state('BRL');
	let formExchangeRate = $state<number | null>(null);

	function today(): string {
		return new Date().toISOString().slice(0, 10);
	}

	const CATEGORY_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

	let formCategories = $derived(categories.filter((c) => c.nature === 'investment'));
	let formSubcategories = $derived(
		formCategoryId ? subcategories.filter((s) => s.category_id === formCategoryId) : []
	);

	let filteredCategories = $derived(
		selectedCategory
			? portfolio?.by_category.filter((c) => c.category === selectedCategory) ?? []
			: portfolio?.by_category ?? []
	);

	onMount(async () => {
		try {
			const [p, t, accs, cats, subs, currs] = await Promise.all([
				getPortfolio(),
				getPortfolioTimeline(),
				getAccounts(),
				getCategories(),
				getSubcategories(),
				getCurrencies()
			]);
			portfolio = p;
			timeline = t;
			accounts = accs;
			categories = cats;
			subcategories = subs;
			currencies = currs;
			if (accs.length > 0) formAccountId = accs[0].id;
			const invCats = cats.filter((c) => c.nature === 'investment');
			if (invCats.length > 0) formCategoryId = invCats[0].id;
			const invSubcats = subs.filter((s) =>
				invCats.some((c) => c.id === s.category_id)
			);
			if (invSubcats.length > 0) formSubcategoryId = invSubcats[0].id;
			if (currs.length > 0) formCurrencyId = currs[0].id;
		} catch (e) {
			error = 'Erro ao carregar dados';
			console.error(e);
		} finally {
			loading = false;
		}
	});

	function resetForm() {
		formDate = today();
		formAmount = 0;
		formDescription = '';
		formAccountId = accounts.length > 0 ? accounts[0].id : '';
		formCategoryId = formCategories.length > 0 ? formCategories[0].id : '';
		formSubcategoryId = formSubcategories.length > 0 ? formSubcategories[0].id : '';
		formCurrencyId = currencies.length > 0 ? currencies[0].id : '';
		formSymbol = '';
		formQuantity = 0;
		formInvestCurrency = 'BRL';
		formExchangeRate = null;
		formError = null;
	}

	function openModal() {
		resetForm();
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		formError = null;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!formAmount || !formSymbol || !formQuantity || !formSubcategoryId || !formAccountId || !formCurrencyId) {
			formError = 'Preencha todos os campos obrigatórios.';
			return;
		}
		saving = true;
		formError = null;
		try {
			// Step 1: Create transaction
			const tx = await createTransaction({
				date_transaction: formDate,
				type: 'outcome',
				subcategory_id: formSubcategoryId,
				account_id: formAccountId,
				currency_id: formCurrencyId,
				amount: formAmount,
				description: formDescription || null,
				payment_methods: 'pix'
			});

			// Step 2: Create investment ledger entry
			await createInvestment({
				transaction_id: tx.id,
				symbol: formSymbol.toUpperCase(),
				quantity: formQuantity,
				currency: formInvestCurrency,
				purchase_exchange_rate: formInvestCurrency !== 'BRL' ? formExchangeRate : null
			});

			// Step 3: Refresh data
			const [p, t] = await Promise.all([getPortfolio(), getPortfolioTimeline()]);
			portfolio = p;
			timeline = t;
			closeModal();
		} catch (err) {
			console.error(err);
			formError = 'Erro ao criar investimento. Verifique os dados.';
		} finally {
			saving = false;
		}
	}

	function formatBRL(value: number): string {
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
	}

	function formatPercent(value: number): string {
		return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
	}

	$effect(() => {
		if (!browser || !portfolio || !donutCanvas) return;
		donutChart?.destroy();
		const data = portfolio.by_category.map((c) => ({
			label: c.category,
			value: c.weight_pct
		}));
		donutChart = new ChartJS(donutCanvas, {
			type: 'doughnut',
			data: {
				labels: data.map((d) => d.label),
				datasets: [
					{
						data: data.map((d) => d.value),
						backgroundColor: CATEGORY_COLORS.slice(0, data.length)
					}
				]
			},
			options: {
				responsive: true,
				plugins: {
					legend: { position: 'bottom' as const },
					tooltip: {
						callbacks: {
							label: (ctx) => `${ctx.label}: ${Number(ctx.parsed).toFixed(1)}%`
						}
					}
				}
			}
		});
		return () => {
			donutChart?.destroy();
		};
	});

	$effect(() => {
		if (!browser || timeline.length === 0 || !lineCanvas) return;
		lineChart?.destroy();
		const dates = timeline.map((t) => t.date);
		lineChart = new ChartJS(lineCanvas, {
			type: 'line',
			data: {
				labels: dates,
				datasets: [
					{
						label: 'Valor Aportado',
						data: timeline.map((t) => t.invested),
						borderColor: '#f59e0b',
						backgroundColor: '#f59e0b20',
						fill: true,
						tension: 0.3
					},
					{
						label: 'Valor de Mercado',
						data: timeline.map((t) => t.market_value),
						borderColor: '#2563eb',
						backgroundColor: '#2563eb20',
						fill: true,
						tension: 0.3
					}
				]
			},
			options: {
				responsive: true,
				interaction: { intersect: false, mode: 'index' as const },
				plugins: { legend: { position: 'bottom' as const } },
				scales: {
					x: {
						type: 'time' as const,
						time: { tooltipFormat: 'dd/MM/yyyy' }
					},
					y: {
						beginAtZero: true,
						ticks: {
							callback: (v) => 'R$ ' + Number(v).toLocaleString('pt-BR')
						}
					}
				}
			}
		});
		return () => {
			lineChart?.destroy();
		};
	});
</script>

<div class="px-4 md:px-6 py-5 space-y-5">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-text-primary">Investimentos</h1>
		<button
			onclick={openModal}
			class="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.98]"
		>
			<Plus size={16} /> Novo Investimento
		</button>
	</div>

	{#if loading}
		<!-- Skeleton cards -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			{#each [1, 2, 3] as _}
				<div class="bg-surface border border-border rounded-xl p-5 animate-pulse">
					<div class="h-4 w-24 bg-surface-3 rounded mb-3"></div>
					<div class="h-6 w-32 bg-surface-3 rounded"></div>
				</div>
			{/each}
		</div>
		<p class="text-muted text-center py-8">Carregando...</p>
	{:else if error}
		<p class="text-danger text-center py-8">{error}</p>
	{:else if portfolio && portfolio.by_category.length === 0}
		<!-- Empty state -->
		<div class="text-center py-12 text-muted">
			<p class="text-4xl mb-3">&#x1F4CA;</p>
			<p class="text-lg">Nenhum investimento cadastrado</p>
		</div>
	{:else if portfolio}
		<!-- Summary Cards -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="bg-surface border border-border rounded-xl p-5 hover:bg-surface-2/40 transition-colors">
				<div class="flex items-center gap-2 text-muted text-sm mb-1">
					<TrendingDown size={16} />
					<span>Total Investido</span>
				</div>
				<p class="text-xl font-bold text-text-primary font-data">{formatBRL(portfolio.total_invested)}</p>
			</div>
			<div class="bg-surface border border-border rounded-xl p-5 hover:bg-surface-2/40 transition-colors">
				<div class="flex items-center gap-2 text-muted text-sm mb-1">
					<Wallet size={16} />
					<span>Valor de Mercado</span>
				</div>
				<p class="text-xl font-bold text-text-primary font-data">{formatBRL(portfolio.total_current_value)}</p>
			</div>
			<div class="bg-surface border border-border rounded-xl p-5 hover:bg-surface-2/40 transition-colors">
				<div class="flex items-center gap-2 text-muted text-sm mb-1">
					<TrendingUp size={16} />
					<span>Resultado (P&L)</span>
				</div>
				<p class="text-xl font-bold {portfolio.total_return >= 0 ? 'text-green-500' : 'text-red-500'} font-data">
					{formatBRL(portfolio.total_return)} ({formatPercent(portfolio.total_return_pct)})
				</p>
			</div>
		</div>

		<!-- Charts -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div class="bg-surface border border-border rounded-xl p-5">
				<h3 class="text-sm font-semibold text-text-primary mb-3">Distribui&#x00E7;&#x00E3;o por Categoria</h3>
				<canvas bind:this={donutCanvas}></canvas>
			</div>
			<div class="bg-surface border border-border rounded-xl p-5">
				<h3 class="text-sm font-semibold text-text-primary mb-3">Evolu&#x00E7;&#x00E3;o da Carteira</h3>
				<canvas bind:this={lineCanvas}></canvas>
			</div>
		</div>

		<!-- Category Filter -->
		<div class="flex flex-wrap gap-2">
			<button
				onclick={() => (selectedCategory = null)}
				class="px-3 py-1.5 rounded-lg text-sm transition-colors {selectedCategory === null
					? 'bg-primary text-white'
					: 'bg-surface-3 text-muted hover:text-text-primary'}"
			>
				Todas
			</button>
			{#each portfolio.by_category as cat}
				<button
					onclick={() => (selectedCategory = cat.category)}
					class="px-3 py-1.5 rounded-lg text-sm transition-colors {selectedCategory === cat.category
						? 'bg-primary text-white'
						: 'bg-surface-3 text-muted hover:text-text-primary'}"
				>
					{cat.category}
				</button>
			{/each}
		</div>

		<!-- Per-Category Tables -->
		<div class="space-y-6">
			<h2 class="text-lg font-bold text-text-primary">Carteira por Categoria</h2>
			{#each filteredCategories as cat}
				<div class="bg-surface border border-border rounded-xl overflow-hidden">
					<div class="px-4 py-3 bg-surface-2 border-b border-border">
						<h3 class="font-semibold text-text-primary">{cat.category}</h3>
					</div>
					<!-- Desktop table -->
					<div class="hidden md:block overflow-x-auto">
						<table class="sheet-table w-full text-sm">
							<thead>
								<tr class="text-muted text-xs uppercase tracking-wider">
									<th class="text-left px-4 py-3">Ativo</th>
									<th class="text-center px-4 py-3">Qtde</th>
									<th class="text-center px-4 py-3">Pre&#x00E7;o Atual</th>
									<th class="text-center px-4 py-3">Total Investido</th>
									<th class="text-center px-4 py-3">Valor Mercado</th>
									<th class="text-center px-4 py-3">Retorno</th>
									<th class="text-center px-4 py-3">Peso na Cat.</th>
								</tr>
							</thead>
							<tbody>
								{#each cat.assets as asset, i}
									<tr
										class="{i % 2 === 0
											? 'bg-surface'
											: 'bg-surface/50'} hover:bg-surface-2/50 transition-colors"
									>
										<td class="px-4 py-3 font-medium text-text-primary">{asset.symbol}</td>
										<td class="px-4 py-3 text-center text-text-primary font-data">{asset.quantity}</td>
										<td class="px-4 py-3 text-center text-text-primary font-data"
											>{asset.current_price ? formatBRL(asset.current_price) : '-'}</td
										>
										<td class="px-4 py-3 text-center text-text-primary font-data"
											>{formatBRL(asset.total_invested)}</td
										>
										<td class="px-4 py-3 text-center text-text-primary font-data"
											>{formatBRL(asset.current_value)}</td
										>
										<td
											class="px-4 py-3 text-center font-data {asset.return_pct >= 0
												? 'text-green-500'
												: 'text-red-500'}"
										>
											{formatPercent(asset.return_pct)}
										</td>
										<td class="px-4 py-3 text-center text-text-primary font-data"
											>{asset.weight_in_category.toFixed(1)}%</td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<!-- Mobile cards -->
					<div class="md:hidden space-y-2 p-4">
						{#each cat.assets as asset}
							<div class="bg-surface border border-border rounded-lg p-3 space-y-1">
								<div class="flex justify-between">
									<span class="font-medium text-text-primary">{asset.symbol}</span>
									<span
										class="{asset.return_pct >= 0
											? 'text-green-500'
											: 'text-red-500'} font-data"
										>{formatPercent(asset.return_pct)}</span
									>
								</div>
								<div class="flex justify-between text-sm text-muted">
									<span>Investido: {formatBRL(asset.total_invested)}</span>
									<span>Mercado: {formatBRL(asset.current_value)}</span>
								</div>
								<div class="flex justify-between text-sm text-muted">
									<span>Qtde: {asset.quantity}</span>
									<span>Peso: {asset.weight_in_category.toFixed(1)}%</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Modal -->
{#if showModal}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
		onclick={closeModal}
		role="presentation"
		onkeydown={(e) => e.key === 'Escape' && closeModal()}
	>
		<!-- Modal content -->
		<div
			class="bg-surface border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<form onsubmit={handleSubmit}>
				<!-- Header -->
				<div class="flex items-center justify-between px-5 py-4 border-b border-border">
					<h2 class="text-lg font-bold text-text-primary">Novo Investimento</h2>
					<button type="button" onclick={closeModal} class="text-muted hover:text-text-primary transition-colors">
						<X size={20} />
					</button>
				</div>

				<!-- Body -->
				<div class="p-5 space-y-4">
					<!-- Transaction fields -->
					<h3 class="text-xs font-semibold uppercase tracking-wider text-muted">Dados da Transa&ccedil;&atilde;o</h3>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-1.5">
							<label for="inv-date" class="text-xs text-muted">Data *</label>
							<input
								id="inv-date"
								type="date"
								bind:value={formDate}
								class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40 focus:border-primary/60 outline-none"
							/>
						</div>
						<div class="space-y-1.5">
							<label for="inv-amount" class="text-xs text-muted">Valor Total *</label>
							<input
								id="inv-amount"
								type="number"
								step="0.01"
								min="0.01"
								bind:value={formAmount}
								placeholder="3500,00"
								class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40 focus:border-primary/60 outline-none"
							/>
						</div>
					</div>

					<div class="space-y-1.5">
						<label for="inv-desc" class="text-xs text-muted">Descri&ccedil;&atilde;o</label>
						<input
							id="inv-desc"
							type="text"
							bind:value={formDescription}
							placeholder="Compra de a&ccedil;&otilde;es"
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40 focus:border-primary/60 outline-none"
						/>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-1.5">
							<label for="inv-nature" class="text-xs text-muted">Natureza</label>
							<input
								id="inv-nature"
								type="text"
								value="Investimento"
								disabled
								class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-muted cursor-not-allowed opacity-70"
							/>
						</div>
						<div class="space-y-1.5">
							<label for="inv-category" class="text-xs text-muted">Categoria *</label>
							<select
								id="inv-category"
								bind:value={formCategoryId}
								onchange={() => { formSubcategoryId = ''; }}
								class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40 focus:border-primary/60 outline-none"
							>
								{#each formCategories as cat}
									<option value={cat.id}>{cat.label}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-1.5">
							<label for="inv-account" class="text-xs text-muted">Conta *</label>
							<select
								id="inv-account"
								bind:value={formAccountId}
								class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40 focus:border-primary/60 outline-none"
							>
								{#each accounts as acc}
									<option value={acc.id}>{acc.label}</option>
								{/each}
							</select>
						</div>
						<div class="space-y-1.5">
							<label for="inv-subcat" class="text-xs text-muted">Tipo de Ativo *</label>
							<select
								id="inv-subcat"
								bind:value={formSubcategoryId}
								class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40 focus:border-primary/60 outline-none"
							>
								<option value="">Selecione...</option>
								{#each formSubcategories as sub}
									<option value={sub.id}>{sub.label}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="space-y-1.5">
						<label for="inv-tx-currency" class="text-xs text-muted">Moeda da Transa&ccedil;&atilde;o *</label>
						<select
							id="inv-tx-currency"
							bind:value={formCurrencyId}
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40 focus:border-primary/60 outline-none"
						>
							{#each currencies as cur}
								<option value={cur.id}>{cur.label} ({cur.symbol})</option>
							{/each}
						</select>
					</div>

					<hr class="border-border" />

					<!-- Investment fields -->
					<h3 class="text-xs font-semibold uppercase tracking-wider text-muted">Dados do Ativo</h3>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-1.5">
							<label for="inv-symbol" class="text-xs text-muted">S&iacute;mbolo *</label>
							<input
								id="inv-symbol"
								type="text"
								bind:value={formSymbol}
								placeholder="PETR4"
								class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40 focus:border-primary/60 outline-none uppercase"
							/>
						</div>
						<div class="space-y-1.5">
							<label for="inv-qty" class="text-xs text-muted">Quantidade *</label>
							<input
								id="inv-qty"
								type="number"
								step="any"
								min="0.01"
								bind:value={formQuantity}
								placeholder="100"
								class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40 focus:border-primary/60 outline-none"
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-1.5">
							<label for="inv-currency" class="text-xs text-muted">Moeda do Ativo *</label>
							<input
								id="inv-currency"
								type="text"
								bind:value={formInvestCurrency}
								placeholder="BRL"
								class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40 focus:border-primary/60 outline-none uppercase"
							/>
						</div>
						{#if formInvestCurrency !== 'BRL'}
							<div class="space-y-1.5">
								<label for="inv-rate" class="text-xs text-muted">Taxa de C&acirc;mbio</label>
								<input
									id="inv-rate"
									type="number"
									step="0.01"
									min="0"
									bind:value={formExchangeRate}
									placeholder="5.25"
									class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40 focus:border-primary/60 outline-none"
								/>
							</div>
						{/if}
					</div>

					{#if formError}
						<p class="text-danger text-sm">{formError}</p>
					{/if}
				</div>

				<!-- Footer -->
				<div class="flex justify-end gap-3 px-5 py-4 border-t border-border">
					<button
						type="button"
						onclick={closeModal}
						class="px-4 py-2 text-sm text-muted hover:text-text-primary transition-colors rounded-lg"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={saving}
						class="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
					>
						{saving ? 'Salvando...' : 'Salvar'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}