<script lang="ts">
	import { page } from '$app/stores';
	import { getAccount, getCreditCards, createCreditCard, updateCreditCard, deleteCreditCard, getCreditCardStatements, updateCreditCardStatement } from '$lib/api';
	import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS, ACCOUNT_TYPE_ICONS, type Account } from '$lib/types/account';
	import type { CreditCard, CreditCardCreate, CreditCardUpdate } from '$lib/types/credit_card';
	import type { CreditCardStatement } from '$lib/types/credit_card_statement';
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
	const currentMonthStatement = $derived(() => {
		if (!expandedCardId) return null;
		const now = new Date();
		return statements.find(s => {
			const d = new Date(s.end_date);
			return s.credit_card_id === expandedCardId && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
		});
	});
	const cardTotalAmount = $derived(() => {
		if (!expandedCardId) return 0;
		return statements.filter(s => s.credit_card_id === expandedCardId).reduce((sum, s) => sum + (s.total_amount ?? 0), 0);
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
	});

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
	}

	function formatShortDate(iso: string): string {
		return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
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
				class="text-muted hover:text-text-primary transition-colors p-1"
			>
				←
			</button>
			<div class="flex items-center gap-3">
				<div
					class="w-10 h-10 rounded-xl flex items-center justify-center text-base font-semibold"
					style="background-color: {ACCOUNT_TYPE_COLORS[account.type]}15; color: {ACCOUNT_TYPE_COLORS[account.type]}"
				>
					{account.label.charAt(0).toUpperCase()}
				</div>
				<div>
					<h1 class="text-xl font-bold text-text-primary">{account.label}</h1>
					<p class="text-sm text-muted">
						{ACCOUNT_TYPE_ICONS[account.type]} {ACCOUNT_TYPE_LABELS[account.type]}
					</p>
				</div>
			</div>
		</div>

		<!-- Info card -->
		<div class="bg-surface border border-border rounded-xl p-5 space-y-4 animate-fade-up">
			<h2 class="text-sm font-semibold text-muted uppercase tracking-wider">Informações</h2>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<p class="text-xs text-text-secondary">Nome</p>
					<p class="text-text-primary font-medium">{account.label}</p>
				</div>
				<div>
					<p class="text-xs text-text-secondary">Tipo</p>
					<p class="text-text-primary font-medium">{ACCOUNT_TYPE_LABELS[account.type]}</p>
				</div>
				<div>
					<p class="text-xs text-text-secondary">Criada em</p>
					<p class="text-text-primary font-medium font-data">{formatDate(account.created_at)}</p>
				</div>
				<div>
					<p class="text-xs text-text-secondary">Atualizada em</p>
					<p class="text-text-primary font-medium font-data">{formatDate(account.updated_at)}</p>
				</div>
			</div>
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
				<div class="p-5 text-muted text-sm">Carregando cartões...</div>
			{:else if cards.length === 0}
				<div class="p-5 text-muted text-sm text-center">Nenhum cartão vinculado a esta conta</div>
			{:else}
				<div class="divide-y divide-border">
					{#each cards as card (card.id)}
						<div>
							<!-- Card row (clickable) -->
							<button
								onclick={() => toggleExpand(card.id)}
								class="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-2/60 transition-colors text-left"
							>
								<div class="flex items-center gap-3">
									<div
										class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
										style="background-color: #a855f715; color: #a855f7"
									>
										{card.label.charAt(0).toUpperCase()}
									</div>
									<div>
										<p class="text-sm font-medium text-text-primary">{card.label}</p>
										<p class="text-xs text-muted">Dia {card.due_date} · {card.is_active ? 'Ativo' : 'Inativo'}</p>
									</div>
								</div>
								<div class="flex items-center gap-4">
									<div class="text-right">
										<p class="text-xs text-muted">Fatura atual</p>
										<p class="text-sm font-data text-text-primary">{formatCurrency(getCardCurrentMonthAmount(card))}</p>
									</div>
									<div class="text-right">
										<p class="text-xs text-muted">Total</p>
										<p class="text-sm font-data text-text-primary">{formatCurrency(getCardTotalAmount(card))}</p>
									</div>
									<span class="text-muted text-xs transition-transform" style="transform: {expandedCardId === card.id ? 'rotate(180deg)' : 'rotate(0deg)'}">▼</span>
								</div>
							</button>

							<!-- Expanded card details -->
							{#if expandedCardId === card.id}
								<div class="px-5 pb-5 space-y-4 animate-fade-in">
									<!-- Card info -->
									<div class="grid grid-cols-4 gap-3 pt-2">
										<div>
											<p class="text-xs text-text-secondary">Nome</p>
											<p class="text-sm text-text-primary font-medium">{card.label}</p>
										</div>
										<div>
											<p class="text-xs text-text-secondary">Vencimento</p>
											<p class="text-sm text-text-primary font-medium font-data">Dia {card.due_date}</p>
										</div>
										<div>
											<p class="text-xs text-text-secondary">Offset</p>
											<p class="text-sm text-text-primary font-medium font-data">+{card.end_date_offset} dias</p>
										</div>
										<div>
											<p class="text-xs text-text-secondary">Status</p>
											<p class="text-sm font-medium" style="color: {card.is_active ? '#22c55e' : '#ef4444'}">
												{card.is_active ? 'Ativo' : 'Inativo'}
											</p>
										</div>
									</div>

									<!-- Actions -->
									<div class="flex gap-2">
										<button
											onclick={() => openEditModal(card)}
											class="text-xs text-muted hover:text-text-primary hover:bg-surface-2 px-3 py-1.5 rounded-lg transition-colors"
										>
											Editar
										</button>
										<button
											onclick={() => showDeleteConfirm = card.id}
											class="text-xs text-danger hover:bg-danger/10 px-3 py-1.5 rounded-lg transition-colors"
										>
											Excluir
										</button>
									</div>

									<!-- Statements table -->
									<div>
										<h3 class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Faturas</h3>
										{#if cardStatements.length === 0}
											<p class="text-xs text-muted">Nenhuma fatura registrada</p>
										{:else}
											<table class="sheet-table">
												<thead>
													<tr>
														<th>Vencimento</th>
														<th>Valor</th>
														<th>Status</th>
														<th></th>
													</tr>
												</thead>
												<tbody>
													{#each cardStatements as stmt (stmt.id)}
														<tr>
															<td class="font-data">{formatShortDate(stmt.end_date)}</td>
															<td class="font-data">{formatCurrency(stmt.total_amount)}</td>
															<td>
																<span
																	class="text-[10px] font-semibold px-1.5 py-0.5 rounded"
																	style="background-color: {stmt.is_paid ? '#22c55e15' : '#f9731615'}; border: 1px solid {stmt.is_paid ? '#22c55e30' : '#f9731630'}; color: {stmt.is_paid ? '#22c55e' : '#f97316'}"
																>
																	{stmt.is_paid ? 'Pago' : 'Aberto'}
																</span>
															</td>
															<td>
																<button
																	onclick={() => toggleStatementPaid(stmt.id)}
																	class="text-xs text-muted hover:text-text-primary transition-colors"
																>
																	{stmt.is_paid ? 'Desfazer' : 'Pagar'}
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
		<div class="bg-surface border border-border rounded-xl p-5 space-y-2 animate-fade-up">
			<h2 class="text-sm font-semibold text-muted uppercase tracking-wider">Transações da Conta</h2>
			<p class="text-text-secondary text-sm">Em breve...</p>
		</div>

		<!-- Balance Section -->
		<div class="bg-surface border border-border rounded-xl p-5 space-y-2 animate-fade-up">
			<h2 class="text-sm font-semibold text-muted uppercase tracking-wider">Saldo</h2>
			<p class="text-text-secondary text-sm">Em breve...</p>
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
