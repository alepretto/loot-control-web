<script lang="ts">
	import { auth, isAuthenticated } from '$lib/stores/auth';
	import { logout } from '$lib/api';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let { children } = $props();

	let loading = $state(true);

	const mainNav = [
		{ href: '/painel', label: 'Painel', icon: '⌂' },
		{ href: '/lancamentos', label: 'Lançamentos', icon: '☰' },
		{ href: '/patrimonio', label: 'Patrimônio', icon: '▮' },
		{ href: '/investimentos', label: 'Investimentos', icon: '↗' },
		{ href: '/contas', label: 'Contas', icon: '◻' },
		{ href: '/resumo', label: 'Resumo', icon: '≣' },
	];

	const manageNav = [
		{ href: '/recorrencias', label: 'Recorrências', icon: '↻' },
		{ href: '/dados', label: 'Dados', icon: '⚐' },
		{ href: '/orcamentos', label: 'Orçamentos', icon: '◎' },
		{ href: '/passivos', label: 'Passivos', icon: '↘' },
		{ href: '/configuracoes', label: 'Configurações', icon: '⚙' },
	];

	onMount(async () => {
		await auth.load();
		loading = false;
	});

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}
</script>

{#if loading}
	<div class="flex items-center justify-center h-screen bg-dot-grid">
		<div class="animate-fade-in text-muted">Carregando...</div>
	</div>
{:else if $isAuthenticated}
	<div class="flex h-screen bg-dot-grid">
		<!-- Sidebar -->
		<aside class="hidden md:flex flex-col w-56 bg-surface border-r border-border shrink-0">
			<div class="p-4 pb-2">
				<h1 class="text-lg font-bold text-text-primary">Loot Control</h1>
			</div>

			<nav class="flex-1 px-2 space-y-1 overflow-y-auto">
				<p class="text-[10px] font-semibold text-muted uppercase tracking-wider px-2 pt-2 pb-1">Principal</p>
				{#each mainNav as item}
					<a
						href={item.href}
						class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors {isActive(item.href) ? 'bg-primary/10 text-primary nav-active-indicator' : 'text-muted hover:bg-surface-2 hover:text-text-primary'}"
					>
						<span class="text-base opacity-70">{item.icon}</span>
						{item.label}
					</a>
				{/each}

				<p class="text-[10px] font-semibold text-muted uppercase tracking-wider px-2 pt-4 pb-1">Gestão</p>
				{#each manageNav as item}
					<a
						href={item.href}
						class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors {isActive(item.href) ? 'bg-primary/10 text-primary nav-active-indicator' : 'text-muted hover:bg-surface-2 hover:text-text-primary'}"
					>
						<span class="text-base opacity-70">{item.icon}</span>
						{item.label}
					</a>
				{/each}
			</nav>

			<div class="p-3 border-t border-border">
				{#if $auth}
					<div class="flex items-center justify-between">
						<div class="min-w-0">
							<p class="text-sm text-text-primary truncate">{$auth.first_name} {$auth.last_name}</p>
							<p class="text-xs text-muted truncate">{$auth.email}</p>
						</div>
						<button
							onclick={() => logout()}
							class="text-muted hover:text-danger transition-colors p-1"
							title="Sair"
						>
							→
						</button>
					</div>
				{/if}
			</div>
		</aside>

		<!-- Main content -->
		<main class="flex-1 overflow-auto">
			{@render children()}
		</main>
	</div>
{:else}
	<div class="flex items-center justify-center h-screen bg-dot-grid">
		<div class="animate-fade-in text-muted">Redirecionando...</div>
	</div>
{/if}