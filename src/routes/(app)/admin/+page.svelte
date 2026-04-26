<script lang="ts">
	import { onMount } from 'svelte';
	import { RefreshCw, Calendar, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-svelte';
	import { updateExchangeRates, getCurrencies } from '$lib/api';
	import type { Currency, UpdateExchangeRatesResponse } from '$lib/types';

	let currencies = $state<Currency[]>([]);
	let fromCurrency = $state('USD');
	let toCurrency = $state('BRL');
	let startDate = $state('');
	let endDate = $state('');
	let running = $state(false);
	let result = $state<UpdateExchangeRatesResponse | null>(null);
	let errorMessage = $state<string | null>(null);

	onMount(async () => {
		try {
			currencies = await getCurrencies();
		} catch { /* ignore */ }

		// Default date range: last 7 days
		const today = new Date();
		const lastWeek = new Date(today);
		lastWeek.setDate(lastWeek.getDate() - 7);
		startDate = lastWeek.toISOString().split('T')[0];
		endDate = today.toISOString().split('T')[0];
	});

	async function runJob() {
		if (!startDate || !endDate || !fromCurrency || !toCurrency) return;
		running = true;
		errorMessage = null;
		result = null;

		try {
			result = await updateExchangeRates({
				from_currency: fromCurrency,
				to_currency: toCurrency,
				start_date: startDate,
				end_date: endDate
			});
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
		} finally {
			running = false;
		}
	}
</script>

<div class="px-4 md:px-6 py-5 space-y-5">
	<!-- Header -->
	<div class="animate-fade-up">
		<h1 class="text-xl font-bold text-text-primary">Admin</h1>
		<p class="text-sm text-muted mt-0.5">Ferramentas administrativas do sistema</p>
	</div>

	<!-- Update Exchange Rates Card -->
	<div class="bg-surface border border-border/50 rounded-xl overflow-hidden animate-fade-up" style="animation-delay: 70ms;">
		<div class="p-5">
			<div class="flex items-center gap-2.5 mb-4">
				<div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
					<RefreshCw class="w-4 h-4" />
				</div>
				<div>
					<h2 class="text-sm font-semibold text-text-primary">Atualizar taxas de câmbio</h2>
					<p class="text-[11px] text-muted">Busca taxas da AwesomeAPI para o período selecionado</p>
				</div>
			</div>

			<div class="space-y-4">
				<!-- Currency Pair -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="from-currency" class="block text-xs text-muted mb-1.5">Moeda de origem</label>
						<input
							id="from-currency"
							type="text"
							bind:value={fromCurrency}
							placeholder="Ex: USD"
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2.5 text-sm text-text-primary font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
							maxlength="10"
						/>
					</div>
					<div>
						<label for="to-currency" class="block text-xs text-muted mb-1.5">Moeda de destino</label>
						<input
							id="to-currency"
							type="text"
							bind:value={toCurrency}
							placeholder="Ex: BRL"
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2.5 text-sm text-text-primary font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
							maxlength="10"
						/>
					</div>
				</div>

				<!-- Date Range -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="start-date" class="block text-xs text-muted mb-1.5">Data inicial</label>
						<div class="relative">
							<div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
								<Calendar class="w-4 h-4" />
							</div>
							<input
								id="start-date"
								type="date"
								bind:value={startDate}
								class="w-full bg-surface-3 border border-border/70 rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
							/>
						</div>
					</div>
					<div>
						<label for="end-date" class="block text-xs text-muted mb-1.5">Data final</label>
						<div class="relative">
							<div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
								<Calendar class="w-4 h-4" />
							</div>
							<input
								id="end-date"
								type="date"
								bind:value={endDate}
								class="w-full bg-surface-3 border border-border/70 rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
							/>
						</div>
					</div>
				</div>

				<!-- Action -->
				<div class="flex items-center justify-between pt-1">
					{#if currencies.length > 0}
						<div class="flex flex-wrap gap-1.5">
							<span class="text-[10px] text-muted">Disponíveis:</span>
							{#each currencies as c}
								<button
									onclick={() => { fromCurrency = c.code; }}
									class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-3 text-muted hover:text-text-primary hover:bg-primary/20 transition-colors"
								>{c.code}</button>
							{/each}
						</div>
					{:else}
						<div></div>
					{/if}

					<button
						onclick={runJob}
						disabled={running || !startDate || !endDate}
						class="bg-primary hover:bg-primary-hover text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
					>
						<RefreshCw class="w-4 h-4 {running ? 'animate-spin' : ''}" />
						{running ? 'Atualizando...' : 'Atualizar taxas'}
					</button>
				</div>
			</div>
		</div>

		<!-- Result -->
		{#if errorMessage}
			<div class="mx-5 pb-5">
				<div class="flex items-start gap-2.5 bg-danger/10 border border-danger/30 rounded-xl px-4 py-3.5">
					<AlertTriangle class="w-4 h-4 text-danger shrink-0 mt-0.5" />
					<div>
						<p class="text-sm font-medium text-danger">Erro ao atualizar taxas</p>
						<p class="text-xs text-muted mt-0.5">{errorMessage}</p>
					</div>
				</div>
			</div>
		{/if}

		{#if result}
			<div class="mx-5 pb-5">
				<div class="flex items-start gap-2.5 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3.5">
					<CheckCircle2 class="w-4 h-4 text-accent shrink-0 mt-0.5" />
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-accent">Taxas atualizadas com sucesso</p>
						<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
							<div class="bg-surface-3/50 rounded-lg px-3 py-2 text-center">
								<p class="text-[10px] text-muted uppercase tracking-wider">Processadas</p>
								<p class="text-lg font-bold text-text-primary font-data">{result.total_processed}</p>
							</div>
							<div class="bg-surface-3/50 rounded-lg px-3 py-2 text-center">
								<p class="text-[10px] text-muted uppercase tracking-wider">Par</p>
								<p class="text-lg font-bold text-text-primary font-data">{result.from_currency}/{result.to_currency}</p>
							</div>
							<div class="bg-surface-3/50 rounded-lg px-3 py-2 text-center">
								<p class="text-[10px] text-muted uppercase tracking-wider">Início</p>
								<p class="text-sm font-bold text-text-primary font-data">{result.start_date}</p>
							</div>
							<div class="bg-surface-3/50 rounded-lg px-3 py-2 text-center">
								<p class="text-[10px] text-muted uppercase tracking-wider">Fim</p>
								<p class="text-sm font-bold text-text-primary font-data">{result.end_date}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
