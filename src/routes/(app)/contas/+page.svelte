<script lang="ts">
	import { getAccounts, createAccount, updateAccount, deleteAccount } from '$lib/api';
	import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS, ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_ORDER, type Account, type AccountType } from '$lib/types/account';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Landmark, X, Plus, Pencil, Trash2 } from 'lucide-svelte';

	let accounts = $state<Account[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let editingId = $state<string | null>(null);

	let label = $state('');
	let type = $state<AccountType>('bank');
	let logo = $state('');
	let formError = $state('');
	let deletingId = $state<string | null>(null);

	onMount(async () => {
		await loadAccounts();
	});

	async function loadAccounts() {
		try {
			accounts = await getAccounts();
		} catch (e: any) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		label = '';
		type = 'bank';
		logo = '';
		formError = '';
		editingId = null;
	}

	function openCreate() {
		resetForm();
		showForm = true;
	}

	function openEdit(account: Account) {
		label = account.label;
		type = account.type;
		logo = account.logo || '';
		editingId = account.id;
		showForm = true;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		formError = '';

		try {
			if (editingId) {
				await updateAccount(editingId, { label, type, logo: logo || null });
			} else {
				await createAccount({ label, type, logo: logo || null });
			}
			showForm = false;
			resetForm();
			await loadAccounts();
		} catch (e: any) {
			formError = e.message || 'Erro ao salvar';
		}
	}

	async function handleDelete(id: string) {
		try {
			await deleteAccount(id);
			deletingId = null;
			await loadAccounts();
		} catch (e: any) {
			console.error(e);
		}
	}

	function groupByType(): { type: AccountType; accounts: Account[] }[] {
		const groups = new Map<AccountType, Account[]>();
		for (const a of accounts) {
			const list = groups.get(a.type) ?? [];
			list.push(a);
			groups.set(a.type, list);
		}
		return ACCOUNT_TYPE_ORDER
			.filter((t) => groups.has(t))
			.map((t) => ({ type: t, accounts: groups.get(t)! }));
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
	}
</script>

<div class="px-4 md:px-6 py-5 space-y-5">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-bold text-text-primary">Contas</h1>
			<p class="text-sm text-muted mt-0.5">Gerencie suas contas bancárias, carteiras e plataformas</p>
		</div>
		<button
			onclick={openCreate}
			class="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
		>
			+ Nova conta
		</button>
	</div>

	{#if loading}
		<div class="text-muted text-sm animate-fade-in">Carregando...</div>
	{:else if accounts.length === 0}
		<div class="bg-surface border border-border rounded-xl p-8 text-center animate-fade-up">
			<p class="text-muted">Nenhuma conta cadastrada</p>
			<p class="text-text-secondary text-sm mt-1">Clique em "Nova conta" para começar</p>
		</div>
	{:else}
		{#each groupByType() as group (group.type)}
			<div class="space-y-2">
				<div class="flex items-center gap-2 px-1">
					<span class="text-base">{ACCOUNT_TYPE_ICONS[group.type]}</span>
					<h2 class="text-sm font-semibold text-muted uppercase tracking-wider">{ACCOUNT_TYPE_LABELS[group.type]}</h2>
					<span class="text-xs text-text-secondary">{group.accounts.length}</span>
				</div>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
					{#each group.accounts as account (account.id)}
						<button
							onclick={() => goto(`/contas/${account.id}`)}
							class="w-full text-left bg-surface border border-border rounded-lg p-3 hover:bg-surface-2/60 transition-all group cursor-pointer"
						>
							<div class="flex items-center gap-2.5 mb-2">
								<div
									class="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold shrink-0"
									style="background-color: {ACCOUNT_TYPE_COLORS[account.type]}15; color: {ACCOUNT_TYPE_COLORS[account.type]}"
								>
									{account.label.charAt(0).toUpperCase()}
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-text-primary font-medium text-sm truncate">{account.label}</p>
								</div>
								<span class="text-muted group-hover:text-text-secondary transition-colors text-xs">→</span>
							</div>
							<div class="space-y-1.5">
								<div class="flex items-center justify-between">
									<span
										class="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded"
										style="background-color: {ACCOUNT_TYPE_COLORS[account.type]}15; color: {ACCOUNT_TYPE_COLORS[account.type]}"
									>
										{ACCOUNT_TYPE_ICONS[account.type]} {ACCOUNT_TYPE_LABELS[account.type]}
									</span>
									<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<span
											onclick={(e: MouseEvent) => { e.stopPropagation(); openEdit(account); }}
											onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); openEdit(account); } }}
											role="button"
											tabindex="0"
											class="text-muted hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
										>
											Editar
										</span>
										<span
											onclick={(e: MouseEvent) => { e.stopPropagation(); deletingId = account.id; }}
											onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); deletingId = account.id; } }}
											role="button"
											tabindex="0"
											class="text-muted hover:text-danger text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
										>
											Excluir
										</span>
									</div>
								</div>
								{#if account.logo}
									<div class="flex items-center justify-between text-[11px]">
										<span class="text-text-secondary">Logo</span>
										<span class="text-text-primary truncate ml-2 max-w-[60%]">{account.logo}</span>
									</div>
								{/if}
								<div class="flex items-center justify-between text-[11px]">
									<span class="text-text-secondary">Criada</span>
									<span class="text-text-primary font-data">{formatDate(account.created_at)}</span>
								</div>
								<div class="flex items-center justify-between text-[11px]">
									<span class="text-text-secondary">Atualizada</span>
									<span class="text-text-primary font-data">{formatDate(account.updated_at)}</span>
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>

<!-- Create/Edit Modal -->
{#if showForm}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => { showForm = false; resetForm(); }} onkeydown={(e) => { if (e.key === 'Escape') { showForm = false; resetForm(); } }} role="presentation">
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
		<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm shadow-2xl animate-fade-up p-0" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<!-- Header -->
			<div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/50">
				<div class="flex items-center gap-2">
					<Landmark class="w-5 h-5 text-primary" />
					<h2 class="text-lg font-bold text-text-primary">{editingId ? 'Editar conta' : 'Nova conta'}</h2>
				</div>
				<button
					onclick={() => { showForm = false; resetForm(); }}
					class="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text-primary hover:bg-surface-2 transition-all"
					title="Fechar"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<!-- Body -->
			<form onsubmit={handleSubmit}>
				<div class="px-6 pb-4 space-y-4">
					{#if formError}
						<div class="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">
							{formError}
						</div>
					{/if}

					<div>
						<label for="label" class="block text-xs text-muted mb-1.5">Nome da conta</label>
						<input
							id="label"
							type="text"
							bind:value={label}
							required
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
							placeholder="Nubank"
						/>
					</div>

					<div>
						<label for="type" class="block text-xs text-muted mb-1.5">Tipo</label>
						<select
							id="type"
							bind:value={type}
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
						>
							{#each Object.entries(ACCOUNT_TYPE_LABELS) as [value, label_str]}
								<option value={value}>{label_str}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="logo" class="block text-xs text-muted mb-1.5">Logo (opcional)</label>
						<input
							id="logo"
							type="text"
							bind:value={logo}
							class="w-full bg-surface-3 border border-border/70 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
							placeholder="URL do logo"
						/>
					</div>
				</div>

				<!-- Footer -->
				<div class="px-6 pb-6 flex gap-3">
					<button
						type="submit"
						class="flex-1 bg-primary hover:bg-primary-hover text-white rounded-lg py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]"
					>
						{editingId ? 'Salvar' : 'Criar'}
					</button>
					<button
						type="button"
						onclick={() => { showForm = false; resetForm(); }}
						class="flex-1 text-muted hover:text-text-primary border border-border/70 rounded-lg py-2.5 text-sm transition-all duration-200 active:scale-[0.98]"
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
		<div class="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm shadow-2xl animate-fade-up p-0" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<!-- Header -->
			<div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/50">
				<div class="flex items-center gap-2">
					<Trash2 class="w-5 h-5 text-danger" />
					<h2 class="text-lg font-bold text-text-primary">Excluir conta</h2>
				</div>
				<button
					onclick={() => deletingId = null}
					class="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text-primary hover:bg-surface-2 transition-all"
					title="Fechar"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<!-- Body -->
			<div class="px-6 pb-4">
				<p class="text-muted text-sm">Tem certeza? Esta ação não pode ser desfeita.</p>
			</div>

			<!-- Footer -->
			<div class="px-6 pb-6 flex gap-3">
				<button
					onclick={() => handleDelete(deletingId!)}
					class="flex-1 bg-danger/15 text-danger border border-danger/30 rounded-lg py-2.5 text-sm font-medium hover:bg-danger/25 transition-all duration-200 active:scale-[0.98]"
				>
					Excluir
				</button>
				<button
					onclick={() => deletingId = null}
					class="flex-1 text-muted hover:text-text-primary border border-border/70 rounded-lg py-2.5 text-sm transition-all duration-200 active:scale-[0.98]"
				>
					Cancelar
				</button>
			</div>
		</div>
	</div>
{/if}