<script lang="ts">
	import { getAccounts, createAccount, updateAccount, deleteAccount } from '$lib/api';
	import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS, type Account, type AccountType } from '$lib/types/account';
	import { onMount } from 'svelte';

	let accounts = $state<Account[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let editingId = $state<string | null>(null);

	// Form state
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
		<div class="grid gap-3 animate-stagger">
			{#each accounts as account (account.id)}
				<div class="bg-surface border border-border rounded-xl p-4 hover:bg-surface-2/60 transition-colors group">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div
								class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
								style="background-color: {ACCOUNT_TYPE_COLORS[account.type]}20; color: {ACCOUNT_TYPE_COLORS[account.type]}"
							>
								{account.label.charAt(0).toUpperCase()}
							</div>
							<div>
								<p class="text-text-primary font-medium">{account.label}</p>
								<p class="text-xs text-muted">
									{ACCOUNT_TYPE_LABELS[account.type]}
								</p>
							</div>
						</div>
						<div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
							<button
								onclick={() => openEdit(account)}
								class="text-muted hover:text-text-primary text-sm px-2 py-1 rounded transition-colors"
							>
								Editar
							</button>
							<button
								onclick={() => deletingId = account.id}
								class="text-muted hover:text-danger text-sm px-2 py-1 rounded transition-colors"
							>
								Excluir
							</button>
						</div>
					</div>
				</div>
			{/each}
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
				{editingId ? 'Editar conta' : 'Nova conta'}
			</h2>

			{#if formError}
				<div class="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 mb-4 text-sm">
					{formError}
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="label" class="block text-sm text-muted mb-1">Nome da conta</label>
					<input
						id="label"
						type="text"
						bind:value={label}
						required
						class="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
						placeholder="Nubank"
					/>
				</div>

				<div>
					<label for="type" class="block text-sm text-muted mb-1">Tipo</label>
					<select
						id="type"
						bind:value={type}
						class="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
					>
						{#each Object.entries(ACCOUNT_TYPE_LABELS) as [value, label_str]}
							<option value={value}>{label_str}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="logo" class="block text-sm text-muted mb-1">Logo (opcional)</label>
					<input
						id="logo"
						type="text"
						bind:value={logo}
						class="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
						placeholder="URL do logo"
					/>
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
			<h2 class="text-lg font-bold text-text-primary mb-2">Excluir conta</h2>
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