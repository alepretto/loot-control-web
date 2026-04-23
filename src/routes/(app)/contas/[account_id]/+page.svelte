<script lang="ts">
	import { page } from '$app/stores';
	import { getAccount } from '$lib/api';
	import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS, ACCOUNT_TYPE_ICONS, type Account } from '$lib/types/account';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let account = $state<Account | null>(null);
	let loading = $state(true);
	let error = $state('');

	const accountId = $derived($page.params.account_id ?? '');

	onMount(async () => {
		if (!accountId) {
			error = 'ID da conta não encontrado';
			loading = false;
			return;
		}
		try {
			account = await getAccount(accountId);
		} catch (e: any) {
			error = e.message || 'Erro ao carregar conta';
		} finally {
			loading = false;
		}
	});

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
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

		<!-- Placeholder sections -->
		<div class="bg-surface border border-border rounded-xl p-5 space-y-2 animate-fade-up">
			<h2 class="text-sm font-semibold text-muted uppercase tracking-wider">Transações</h2>
			<p class="text-text-secondary text-sm">Em breve...</p>
		</div>

		<div class="bg-surface border border-border rounded-xl p-5 space-y-2 animate-fade-up">
			<h2 class="text-sm font-semibold text-muted uppercase tracking-wider">Saldo</h2>
			<p class="text-text-secondary text-sm">Em breve...</p>
		</div>
	{/if}
</div>