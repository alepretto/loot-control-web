<script lang="ts">
	import { page } from '$app/stores';
	import { getAccount, getCreditCards, createCreditCard, updateCreditCard, deleteCreditCard, getCreditCardStatements, updateCreditCardStatement, getTransactions, updateTransaction, deleteTransaction } from '$lib/api';
	import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS, ACCOUNT_TYPE_ICONS, type Account } from '$lib/types/account';
	import type { CreditCard, CreditCardCreate, CreditCardUpdate } from '$lib/types/credit_card';
	import type { CreditCardStatement } from '$lib/types/credit_card_statement';
	import { PAYMENT_METHOD_LABELS, type Transaction } from '$lib/types/transaction';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let account = $state<Account | null>(null);
	let loading = $state(true);
	let error = $state('');

	const accountId = $derived($page.params.account_id ?? '');

	// Credit cards
	let cards = $state<CreditCard[]>([]);
	let statements = $state<CreditCardStatement[]>([]);
	let cardsLoading = $state(true);

	// Expanded card
	let expandedCardId = $state<string | null>(null);
	const expandedCard = $derived(cards.find(c => c.id === expandedCardId) ?? null);
	const cardStatements = $derived(
		expandedCardId
			? statements.filter(s => s.credit_card_id === expandedCardId).sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())
			: []
	);
	const currentMonthStatement = $derived.by(() => {
		if (!expandedCardId) return null;
		const now = new Date();
		return statements.find(s => {
			const d = new Date(s.end_date);
			return s.credit_card_id === expandedCardId && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
		});
	});
	const cardTotalAmount = $derived.by(() => {
		if (!expandedCardId) return 0;
		return statements.filter(s => s.credit_card_id === expandedCardId).reduce((sum, s) => sum + (s.total_amount ?? 0), 0);
	});

	// Transactions
	let transactions = $state<Transaction[]>([]);
	let transactionsLoading = $state(true);
	let selectedStatementId = $state<string | null>(null);

	const accountTransactions = $derived.by(() => {
		let result = transactions;
		if (selectedStatementId) {
			result = result.filter(t => t.statement_id === selectedStatementId);
		}
		return result.toSorted((a, b) => new Date(b.date_transaction).getTime() - new Date(a.date_transaction).getTime());
	});

	const statementFilterOptions = $derived(
		expandedCardId
			? statements.filter(s => s.credit_card_id === expandedCardId).sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())
			: []
	);

	// Reset statement filter when expanded card changes
	$effect(() => {
		expandedCardId;
		selectedStatementId = null;
	});

	// Card list summary
	function getCardCurrentMonthAmount(card: CreditCard): number | null {
		const now = new Date();
		const stmt = statements.find(s => {
			const d = new Date(s.end_date);
			return s.credit_card_id === card.id && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
		});
		return stmt?.total_amount ?? null;
	}
	function getCardTotalAmount(card: CreditCard): number {
		return statements.filter(s => s.credit_card_id === card.id).reduce((sum, s) => sum + (s.total_amount ?? 0), 0);
	}

	// Transaction modals
	let showEditTxModal = $state(false);
	let editingTx = $state<Transaction | null>(null);
	let showDeleteTxConfirm = $state<string | null>(null);

	let editTxDescription = $state('');
	let editTxAmount = $state(0);
	let editTxType = $state<'outcome' | 'income'>('outcome');
	let editTxPaymentMethod = $state<'pix' | 'debit' | 'credit' | null>(null);

	// Modals
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteConfirm = $state<string | null>(null);

	// Form state
	let formLabel = $state('');
	let formDueDate = $state(15);
	let formEndDateOffset = $state(5);
	let formIsActive = $state(true);

	onMount(async () => {
		if (!accountId) {
			error = 'ID da conta não encontrado';
			loading = false;
			cardsLoading = false;
			return;
		}
		try {
			account = await getAccount(accountId);
		} catch (e: any) {
			error = e.message || 'Erro ao carregar conta';
		} finally {
			loading = false;
		}

		// Load cards and statements
		try {
			const allCards = await getCreditCards();
			cards = allCards.filter(c => c.account_id === accountId);

			const allStatements = await getCreditCardStatements();
			statements = allStatements.filter(s => cards.some(c => c.id === s.credit_card_id));
		} catch {
			// Cards load failure - non-critical
		} finally {
			cardsLoading = false;
		}

		// Load transactions
		try {
			transactions = await getTransactions({ account_id: accountId });
		} catch {
			// Transactions load failure - non-critical
		} finally {
			transactionsLoading = false;
		}
	});

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
	}

	function formatShortDate(iso: string): string {
		return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function formatDateTime(iso: string): string {
		return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function formatCurrency(value: number | null | undefined): string {
		if (value == null) return '—';
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
	}

	function resetForm() {
		formLabel = '';
		formDueDate = 15;
		formEndDateOffset = 5;
		formIsActive = true;
	}

	async function handleCreateCard() {
		if (!formLabel.trim() || !account) return;
		const data: CreditCardCreate = {
			account_id: account.id,
			label: formLabel.trim(),
			due_date: formDueDate,
			end_date_offset: formEndDateOffset,
			is_active: formIsActive
		};
		try {
			const created = await createCreditCard(data);
			cards = [...cards, created];
			showCreateModal = false;
			resetForm();
		} catch (e: any) {
			alert(e.message || 'Erro ao criar cartão');
		}
	}

	async function handleUpdateCard(cardId: string) {
		const data: CreditCardUpdate = {
			label: formLabel.trim(),
			due_date: formDueDate,
			end_date_offset: formEndDateOffset,
			is_active: formIsActive
		};
		try {
			const updated = await updateCreditCard(cardId, data);
			cards = cards.map(c => c.id === cardId ? updated : c);
			showEditModal = false;
			resetForm();
		} catch (e: any) {
			alert(e.message || 'Erro ao atualizar cartão');
		}
	}

	async function handleDeleteCard(cardId: string) {
		try {
			await deleteCreditCard(cardId);
			cards = cards.filter(c => c.id !== cardId);
			statements = statements.filter(s => s.credit_card_id !== cardId);
			if (expandedCardId === cardId) expandedCardId = null;
			showDeleteConfirm = null;
		} catch (e: any) {
			alert(e.message || 'Erro ao excluir cartão');
		}
	}

	async function toggleStatementPaid(statementId: string) {
		const stmt = statements.find(s => s.id === statementId);
		if (!stmt) return;
		try {
			const updated = await updateCreditCardStatement(statementId, { is_paid: !stmt.is_paid });
			statements = statements.map(s => s.id === statementId ? updated : s);
		} catch (e: any) {
			alert(e.message || 'Erro ao atualizar fatura');
		}
	}

	function openEditModal(card: CreditCard) {
		formLabel = card.label;
		formDueDate = card.due_date;
		formEndDateOffset = card.end_date_offset;
		formIsActive = card.is_active;
		showEditModal = true;
	}

	function toggleExpand(cardId: string) {
		expandedCardId = expandedCardId === cardId ? null : cardId;
	}

	function openEditTxModal(tx: Transaction) {
		editingTx = tx;
		editTxDescription = tx.description ?? '';
		editTxAmount = tx.amount;
		editTxType = tx.type;
		editTxPaymentMethod = tx.payment_methods;
		showEditTxModal = true;
	}

	async function handleEditTx() {
		if (!editingTx) return;
		try {
			const updated = await updateTransaction(editingTx.id, {
				description: editTxDescription || null,
				amount: editTxAmount,
				type: editTxType,
				payment_methods: editTxPaymentMethod,
			});
			transactions = transactions.map(t => t.id === updated.id ? updated : t);
			showEditTxModal = false;
			editingTx = null;
		} catch (e: any) {
			alert(e.message || 'Erro ao atualizar transação');
		}
	}

	async function handleDeleteTx(txId: string) {
		try {
			await deleteTransaction(txId);
			transactions = transactions.filter(t => t.id !== txId);
			showDeleteTxConfirm = null;
		} catch (e: any) {
			alert(e.message || 'Erro ao excluir transação');
		}
	}
</script>

<div class="px-4 md:px-6 py-5 space-y-5">
	{#if loading}
		<div class="text-muted text-sm animate-fade-in">Carregando...</div>
	{:else if error}
		<div class="bg-danger/10 border border-danger/30 text-danger rounded-xl p-6 text-center">
			<p>{error}</p>
			<button
				onclick={() => goto('/contas')}
				class="mt-3 text-sm text-muted hover:text-text-primary transition-colors"
			>
				← Voltar para contas
			</button>
		</div>
	{:else if account}
		<!-- Header -->
		<div class="flex items-center gap-4">
			<button
				onclick={() => goto('/contas')}
				class="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-text-primary hover:bg-surface-2 transition-all duration-200 text-sm"
			>
				←
			</button>
			<div class="flex items-center gap-3">
				<div
					class="w-11 h-11 rounded-2xl flex items-center justify-center text-base font-bold shadow-lg"
					style="background: linear-gradient(135deg, {ACCOUNT_TYPE_COLORS[account.type]}22 0%, {ACCOUNT_TYPE_COLORS[account.type]}44 100%); color: {ACCOUNT_TYPE_COLORS[account.type]}; box-shadow: 0 0 20px {ACCOUNT_TYPE_COLORS[account.type]}22"
				>
					{account.label.charAt(0).toUpperCase()}
				</div>
				<div>
					<h1 class="text-xl font-bold text-text-primary">{account.label}</h1>
					<p class="text-sm text-muted flex items-center gap-1.5">
						<span>{ACCOUNT_TYPE_LABELS[account.type]}</span>
						<span class="w-1 h-1 rounded-full bg-border inline-block"></span>
						<span class="font-data text-xs">{account.id.slice(0, 8)}</span>
					</p>
				</div>
			</div>
		</div>

		<!-- Info card -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up">
			{#each [
				{ label: 'Nome', value: account.label, icon: '📋' },
				{ label: 'Tipo', value: ACCOUNT_TYPE_LABELS[account.type], icon: '🏦' },
				{ label: 'Criada em', value: formatDate(account.created_at), icon: '📅' },
				{ label: 'Atualizada em', value: formatDate(account.updated_at), icon: '🔄' },
			] as info}
				<div class="bg-surface border border-border rounded-xl p-4 space-y-1.5 hover:border-primary/20 hover:bg-surface-2/40 transition-all duration-200 group">
					<div class="flex items-center justify-between">
						<p class="text-[10px] font-semibold text-muted uppercase tracking-widest">{info.label}</p>
						<span class="text-xs opacity-40 group-hover:opacity-70 transition-opacity">{info.icon}</span>
					</div>
					<p class="text-sm text-text-primary font-medium font-data">{info.value}</p>
				</div>
			{/each}
		</div>

		<!-- Credit Cards Section -->
		<div class="bg-surface border border-border rounded-xl animate-fade-up">
			<div class="flex items-center justify-between px-5 py-4 border-b border-border">
				<h2 class="text-sm font-semibold text-muted uppercase tracking-wider">Cartões de Crédito</h2>
				<button
					onclick={() => { resetForm(); showCreateModal = true; }}
					class="text-xs bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 px-3 py-1.5 rounded-lg transition-colors"
				>
					+ Novo Cartão
				</button>
			</div>

			{#if cardsLoading}
				<div class="p-5 text-center text-muted text-sm animate-pulse">Carregando cartões...</div>
			{:else if cards.length === 0}
				<div class="p-6 text-center">
					<div class="text-2xl mb-2 opacity-30">💳</div>
					<p class="text-sm text-muted">Nenhum cartão vinculado a esta conta</p>
				</div>
			{:else}
				<div class="divide-y divide-border/50">
					{#each cards as card (card.id)}
						<div class="first:rounded-t-xl last:rounded-b-xl overflow-hidden transition-all duration-200 {expandedCardId === card.id ? 'bg-surface-2/20' : ''}">
							<!-- Card row (clickable) -->
							<button
								onclick={() => toggleExpand(card.id)}
								class="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-2/40 transition-all duration-200 text-left group"
							>
								<div class="flex items-center gap-3.5">
									<div
										class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-transform duration-200 group-hover:scale-110"
										style="background: linear-gradient(135deg, #a855f715, #a855f730); color: #a855f7"
									>
										{card.label.charAt(0).toUpperCase()}
									</div>
									<div>
										<p class="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">{card.label}</p>
										<p class="text-[11px] text-muted flex items-center gap-1.5">
											<span>Vence dia {card.due_date}</span>
											<span class="w-1 h-1 rounded-full bg-border inline-block"></span>
											<span class="flex items-center gap-1">
												<span class="w-1.5 h-1.5 rounded-full inline-block {card.is_active ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}"></span>
												{card.is_active ? 'Ativo' : 'Inativo'}
											</span>
										</p>
									</div>
								</div>
								<div class="flex items-center gap-5">
									<div class="text-right hidden sm:block">
										<p class="text-[10px] text-muted uppercase tracking-wider">Fatura atual</p>
										<p class="text-sm font-data font-semibold text-text-primary">{formatCurrency(getCardCurrentMonthAmount(card))}</p>
									</div>
									<div class="text-right hidden sm:block">
										<p class="text-[10px] text-muted uppercase tracking-wider">Total</p>
										<p class="text-sm font-data font-semibold text-text-primary">{formatCurrency(getCardTotalAmount(card))}</p>
									</div>
									<div
										class="w-6 h-6 rounded-lg flex items-center justify-center text-xs text-muted transition-all duration-300 {expandedCardId === card.id ? 'bg-primary/15 text-primary rotate-180' : 'group-hover:bg-surface-2'}"
									>
										▼
									</div>
								</div>
							</button>

							<!-- Expanded card details -->
							{#if expandedCardId === card.id}
								<div class="px-5 pb-5 space-y-4 animate-fade-in border-t border-border/50 pt-4">
									<!-- Card info -->
									<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
										{#each [
											{ label: 'Nome', value: card.label, mono: false },
											{ label: 'Vencimento', value: `Dia ${card.due_date}`, mono: true },
											{ label: 'Fechamento', value: `Dia ${card.due_date - card.end_date_offset < 1 ? 1 : card.due_date - card.end_date_offset}`, mono: true },
											{ label: 'Offset', value: `${card.end_date_offset} dias`, mono: true },
										] as info}
											<div class="bg-surface-2/40 border border-border/50 rounded-lg px-3 py-2.5">
												<p class="text-[10px] text-muted uppercase tracking-widest mb-0.5">{info.label}</p>
												<p class="text-sm text-text-primary font-medium {info.mono ? 'font-data' : ''}">{info.value}</p>
											</div>
										{/each}
									</div>

									<!-- Actions -->
									<div class="flex gap-2">
										<button
											onclick={() => openEditModal(card)}
											class="text-xs text-muted hover:text-text-primary hover:bg-surface-2 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
										>
											✏️ Editar
										</button>
										<button
											onclick={() => showDeleteConfirm = card.id}
											class="text-xs text-danger hover:bg-danger/10 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
										>
											🗑️ Excluir
										</button>
									</div>

									<!-- Statements table -->
									<div>
										<div class="flex items-center justify-between mb-3">
											<h3 class="text-xs font-semibold text-muted uppercase tracking-wider">Faturas</h3>
											<span class="text-[10px] text-muted font-data">{cardStatements.length} registro{cardStatements.length !== 1 ? 's' : ''}</span>
										</div>
										{#if cardStatements.length === 0}
											<div class="bg-surface-2/40 border border-dashed border-border rounded-lg p-4 text-center">
												<p class="text-xs text-muted">Nenhuma fatura registrada</p>
											</div>
										{:else}
											<table class="sheet-table">
												<thead>
													<tr>
														<th class="text-center">Fechamento</th>
														<th class="text-center">Vencimento</th>
														<th class="text-center">Valor</th>
														<th class="text-center">Status</th>
														<th class="text-center w-20"></th>
													</tr>
												</thead>
												<tbody>
													{#each cardStatements as stmt (stmt.id)}
														{@const dueDate = new Date(stmt.end_date)}
														{@const isClosed = dueDate < new Date()}
														{@const isActiveFilter = selectedStatementId === stmt.id}
														<tr
															onclick={() => {
																selectedStatementId = stmt.id;
																setTimeout(() => document.getElementById('transacoes')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
															}}
															onkeydown={(e) => e.key === 'Enter' && (selectedStatementId = stmt.id)}
															role="button"
															tabindex="0"
															class="cursor-pointer transition-all duration-150 {isActiveFilter ? 'bg-primary/[0.06] ring-1 ring-primary/30' : 'hover:bg-surface-2/60'}"
														>
															<td class="font-data text-center text-xs text-muted">{formatShortDate(stmt.end_date)}</td>
															<td class="font-data text-center text-xs text-text-secondary">{formatShortDate(new Date(dueDate.getTime() + (expandedCard?.end_date_offset ?? 0) * 86400000).toISOString())}</td>
															<td class="font-data text-center font-semibold text-sm">{formatCurrency(stmt.total_amount)}</td>
															<td class="text-center">
																<span
																	class="text-[10px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
																	style="background-color: {stmt.is_paid ? '#22c55e12' : '#f9731612'}; border: 1px solid {stmt.is_paid ? '#22c55e25' : '#f9731625'}; color: {stmt.is_paid ? '#22c55e' : '#f97316'}"
																>
																	<span class="w-1.5 h-1.5 rounded-full inline-block" style="background-color: {stmt.is_paid ? '#22c55e' : '#f97316'}"></span>
																	{stmt.is_paid ? 'Pago' : 'Aberto'}
																</span>
															</td>
															<td class="text-center">
																<button
																	onclick={(e) => { e.stopPropagation(); toggleStatementPaid(stmt.id); }}
																	disabled={!stmt.is_paid && !isClosed}
																	class="text-[11px] px-2 py-1 rounded-md transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed {stmt.is_paid ? 'text-danger hover:bg-danger/10' : isClosed ? 'text-[#22c55e] hover:bg-[#22c55e]/10' : 'text-text-secondary cursor-default'}"
																>
																	{stmt.is_paid ? 'Desfazer' : isClosed ? 'Pagar' : '⏳'}
																</button>
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Transactions Section -->
		<div id="transacoes" class="bg-surface border border-border rounded-xl animate-fade-up scroll-mt-4">
			<div class="flex items-center justify-between px-5 py-4 border-b border-border">
				<h2 class="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
					Transações da Conta
					{#if accountTransactions.length > 0}
						<span class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-normal normal-case">{accountTransactions.length}</span>
					{/if}
				</h2>
				<div class="flex items-center gap-2">
					{#if selectedStatementId}
						<button
							onclick={() => selectedStatementId = null}
							class="text-[10px] text-muted hover:text-text-primary hover:bg-surface-2 px-2 py-1 rounded-md transition-all duration-200"
						>
							✕ Limpar
						</button>
					{/if}
					{#if expandedCardId && statementFilterOptions.length > 0}
						<select
							bind:value={selectedStatementId}
							class="text-xs bg-surface-3 border border-border rounded-lg px-2.5 py-1.5 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
						>
							<option value={null}>Todas as faturas</option>
							{#each statementFilterOptions as stmt}
								<option value={stmt.id}>Fatura {formatShortDate(stmt.end_date)}</option>
							{/each}
						</select>
					{/if}
				</div>
			</div>
			{#if transactionsLoading}
				<div class="p-8 text-center text-muted text-sm animate-pulse">Carregando transações...</div>
			{:else if accountTransactions.length === 0}
				<div class="p-8 text-center">
					<div class="text-2xl mb-2 opacity-30">📭</div>
					<p class="text-sm text-muted">Nenhuma transação registrada para esta conta</p>
					{#if selectedStatementId}
						<p class="text-xs text-muted mt-1">Tente limpar o filtro de fatura</p>
					{/if}
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="sheet-table">
						<thead>
							<tr>
								<th class="text-center text-[10px]">Data</th>
								<th class="text-center text-[10px]">Descrição</th>
								<th class="text-center text-[10px]">Valor</th>
								<th class="text-center text-[10px] w-28">Forma</th>
								<th class="text-center text-[10px] w-28">Tipo</th>
								<th class="text-center text-[10px] w-24">Ações</th>
							</tr>
						</thead>
						<tbody>
							{#each accountTransactions as tx, i (tx.id)}
								{@const isIncome = tx.type === 'income'}
								<tr class="transition-all duration-150 hover:bg-surface-2/40 {i % 2 === 0 ? 'bg-transparent' : 'bg-surface-2/20'}">
									<td class="font-data text-center text-xs text-muted whitespace-nowrap">{formatDateTime(tx.date_transaction)}</td>
									<td class="text-center text-sm text-text-primary max-w-[200px] truncate px-2">{#if tx.description}{tx.description}{:else}<span class="text-muted italic">sem descrição</span>{/if}</td>
									<td class="font-data text-center font-semibold" style="color: {isIncome ? '#22c55e' : '#ef4444'}">
										<span class="text-[10px] opacity-60">{isIncome ? '+' : '−'}</span>{formatCurrency(tx.amount)}
									</td>
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
									<td class="text-center">
										<span
											class="text-[10px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
											style="background-color: {isIncome ? '#22c55e12' : '#ef444412'}; color: {isIncome ? '#22c55e' : '#ef4444'}"
										>
											<span class="w-1.5 h-1.5 rounded-full inline-block" style="background-color: {isIncome ? '#22c55e' : '#ef4444'}"></span>
											{isIncome ? 'Entrada' : 'Saída'}
										</span>
									</td>
									<td class="text-center">
										<div class="flex items-center justify-center gap-1">
											<button
												onclick={() => openEditTxModal(tx)}
												class="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-text-primary hover:bg-surface-2 transition-all duration-200 text-xs active:scale-90"
												title="Editar transação"
											>
												✏️
											</button>
											<button
												onclick={() => showDeleteTxConfirm = tx.id}
												class="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200 text-xs active:scale-90"
												title="Excluir transação"
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
			{/if}
		</div>

		<!-- Edit Transaction Modal -->
		{#if showEditTxModal && editingTx}
			<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
			<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => showEditTxModal = false} onkeydown={(e) => e.key === 'Escape' && (showEditTxModal = false)} role="button" tabindex="0">
				<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
				<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
				<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="presentation">
					<h3 class="text-lg font-semibold text-text-primary">Editar Transação</h3>
					<div class="space-y-3">
						<div>
							<label for="edit-tx-desc" class="text-xs text-muted block mb-1">Descrição</label>
							<input
								id="edit-tx-desc"
								type="text"
								bind:value={editTxDescription}
								class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
							/>
						</div>
						<div>
							<label for="edit-tx-amount" class="text-xs text-muted block mb-1">Valor</label>
							<input
								id="edit-tx-amount"
								type="number"
								step="0.01"
								bind:value={editTxAmount}
								class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-data focus:outline-none focus:border-primary"
							/>
						</div>
						<div>
							<label for="edit-tx-type" class="text-xs text-muted block mb-1">Tipo</label>
							<select
								id="edit-tx-type"
								bind:value={editTxType}
								class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
							>
								<option value="outcome">Saída</option>
								<option value="income">Entrada</option>
							</select>
						</div>
						<div>
							<label for="edit-tx-payment" class="text-xs text-muted block mb-1">Forma de Pagamento</label>
							<select
								id="edit-tx-payment"
								bind:value={editTxPaymentMethod}
								class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
							>
								<option value={null}>Nenhum</option>
								<option value="credit">Crédito</option>
								<option value="debit">Débito</option>
								<option value="pix">Pix</option>
							</select>
						</div>
					</div>
					<div class="flex gap-2 justify-end pt-2">
						<button
							onclick={() => { showEditTxModal = false; editingTx = null; }}
							class="text-sm text-muted hover:text-text-primary hover:bg-surface-2 px-4 py-2 rounded-lg transition-colors"
						>
							Cancelar
						</button>
						<button
							onclick={handleEditTx}
							class="text-sm bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors"
						>
							Salvar
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Delete Transaction Confirmation -->
		{#if showDeleteTxConfirm}
			<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
			<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => showDeleteTxConfirm = null} onkeydown={(e) => e.key === 'Escape' && (showDeleteTxConfirm = null)} role="button" tabindex="0">
				<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
				<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
				<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="presentation">
					<h3 class="text-lg font-semibold text-danger">Excluir Transação</h3>
					<p class="text-sm text-text-secondary">Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.</p>
					<div class="flex gap-2 justify-end pt-2">
						<button
							onclick={() => showDeleteTxConfirm = null}
							class="text-sm text-muted hover:text-text-primary hover:bg-surface-2 px-4 py-2 rounded-lg transition-colors"
						>
							Cancelar
						</button>
						<button
							onclick={() => showDeleteTxConfirm && handleDeleteTx(showDeleteTxConfirm)}
							class="text-sm bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25 px-4 py-2 rounded-lg transition-colors"
						>
							Excluir
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Balance Section -->
		<div class="bg-surface border border-border rounded-xl p-5 space-y-2 animate-fade-up">
			<div class="flex items-center gap-2">
				<h2 class="text-sm font-semibold text-muted uppercase tracking-wider">Saldo</h2>
				<span class="text-[10px] text-text-secondary bg-surface-2 border border-border/50 px-1.5 py-0.5 rounded-md">Em breve</span>
			</div>
			<div class="bg-surface-2/40 border border-dashed border-border/50 rounded-lg p-4 flex items-center justify-center gap-2">
				<span class="text-sm text-muted">🏗️</span>
				<p class="text-sm text-muted">Funcionalidade em desenvolvimento</p>
			</div>
		</div>

		<!-- Create Card Modal -->
		{#if showCreateModal}
			<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
			<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => showCreateModal = false} onkeydown={(e) => e.key === 'Escape' && (showCreateModal = false)} role="button" tabindex="0">
				<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
				<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
				<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="presentation">
					<h3 class="text-lg font-semibold text-text-primary">Novo Cartão</h3>
					<div class="space-y-3">
						<div>
							<label for="card-create-name" class="text-xs text-muted block mb-1">Nome</label>
							<input
								id="card-create-name"
								type="text"
								bind:value={formLabel}
								class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
								placeholder="Ex: Nubank Gold"
							/>
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="card-create-due" class="text-xs text-muted block mb-1">Dia vencimento</label>
								<input
									id="card-create-due"
									type="number"
									bind:value={formDueDate}
									min="1"
									max="31"
									class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-data focus:outline-none focus:border-primary"
								/>
							</div>
							<div>
								<label for="card-create-offset" class="text-xs text-muted block mb-1">Offset (dias)</label>
								<input
									id="card-create-offset"
									type="number"
									bind:value={formEndDateOffset}
									min="1"
									max="15"
									class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-data focus:outline-none focus:border-primary"
								/>
							</div>
						</div>
						<label class="flex items-center gap-2 text-sm text-text-primary">
							<input type="checkbox" bind:checked={formIsActive} class="rounded border-border bg-surface" />
							Ativo
						</label>
					</div>
					<div class="flex gap-2 justify-end pt-2">
						<button
							onclick={() => { showCreateModal = false; resetForm(); }}
							class="text-sm text-muted hover:text-text-primary hover:bg-surface-2 px-4 py-2 rounded-lg transition-colors"
						>
							Cancelar
						</button>
						<button
							onclick={handleCreateCard}
							class="text-sm bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
							disabled={!formLabel.trim()}
						>
							Criar
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Edit Card Modal -->
		{#if showEditModal}
			<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
			<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => showEditModal = false} onkeydown={(e) => e.key === 'Escape' && (showEditModal = false)} role="button" tabindex="0">
				<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
				<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
				<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="presentation">
					<h3 class="text-lg font-semibold text-text-primary">Editar Cartão</h3>
					<div class="space-y-3">
						<div>
							<label for="card-edit-name" class="text-xs text-muted block mb-1">Nome</label>
							<input
								id="card-edit-name"
								type="text"
								bind:value={formLabel}
								class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
							/>
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="card-edit-due" class="text-xs text-muted block mb-1">Dia vencimento</label>
								<input
									id="card-edit-due"
									type="number"
									bind:value={formDueDate}
									min="1"
									max="31"
									class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-data focus:outline-none focus:border-primary"
								/>
							</div>
							<div>
								<label for="card-edit-offset" class="text-xs text-muted block mb-1">Offset (dias)</label>
								<input
									id="card-edit-offset"
									type="number"
									bind:value={formEndDateOffset}
									min="1"
									max="15"
									class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-data focus:outline-none focus:border-primary"
								/>
							</div>
						</div>
						<label class="flex items-center gap-2 text-sm text-text-primary">
							<input type="checkbox" bind:checked={formIsActive} class="rounded border-border bg-surface" />
							Ativo
						</label>
					</div>
					<div class="flex gap-2 justify-end pt-2">
						<button
							onclick={() => { showEditModal = false; resetForm(); }}
							class="text-sm text-muted hover:text-text-primary hover:bg-surface-2 px-4 py-2 rounded-lg transition-colors"
						>
							Cancelar
						</button>
						<button
							onclick={() => expandedCardId && handleUpdateCard(expandedCardId)}
							class="text-sm bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
							disabled={!formLabel.trim()}
						>
							Salvar
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Delete Confirmation Modal -->
		{#if showDeleteConfirm}
			<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
			<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => showDeleteConfirm = null} onkeydown={(e) => e.key === 'Escape' && (showDeleteConfirm = null)} role="button" tabindex="0">
				<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
				<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
				<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="presentation">
					<h3 class="text-lg font-semibold text-danger">Excluir Cartão</h3>
					<p class="text-sm text-text-secondary">Tem certeza que deseja excluir este cartão? Esta ação não pode ser desfeita.</p>
					<div class="flex gap-2 justify-end pt-2">
						<button
							onclick={() => showDeleteConfirm = null}
							class="text-sm text-muted hover:text-text-primary hover:bg-surface-2 px-4 py-2 rounded-lg transition-colors"
						>
							Cancelar
						</button>
						<button
							onclick={() => showDeleteConfirm && handleDeleteCard(showDeleteConfirm)}
							class="text-sm bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25 px-4 py-2 rounded-lg transition-colors"
						>
							Excluir
						</button>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
