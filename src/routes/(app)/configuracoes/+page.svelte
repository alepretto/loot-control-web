<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	const TIMEZONES = [
		{ value: 'America/Sao_Paulo', label: 'Brasília (UTC-3)' },
		{ value: 'America/Manaus', label: 'Manaus (UTC-4)' },
		{ value: 'America/Rio_Branco', label: 'Rio Branco (UTC-5)' },
		{ value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
		{ value: 'UTC', label: 'UTC' },
		{ value: 'America/New_York', label: 'Nova York (UTC-5/UTC-4)' },
		{ value: 'America/Chicago', label: 'Chicago (UTC-6/UTC-5)' },
		{ value: 'America/Denver', label: 'Denver (UTC-7/UTC-6)' },
		{ value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/UTC-7)' },
		{ value: 'Europe/Lisbon', label: 'Lisboa (UTC+0/UTC+1)' },
		{ value: 'Europe/London', label: 'Londres (UTC+0/UTC+1)' },
		{ value: 'Europe/Paris', label: 'Paris (UTC+1/UTC+2)' },
	];

	let selectedTimezone = $state('America/Sao_Paulo');
	let saved = $state(false);

	onMount(() => {
		selectedTimezone = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
	});

	function saveTimezone() {
		localStorage.setItem('timezone', selectedTimezone);
		saved = true;
		setTimeout(() => { saved = false; }, 2000);
	}
</script>

<div class="px-4 md:px-6 py-5 space-y-5">
	<div>
		<h1 class="text-xl font-bold text-text-primary">Configurações</h1>
		<p class="text-sm text-muted mt-0.5">Gerencie suas preferências</p>
	</div>

	<div class="bg-surface border border-border rounded-xl p-6 space-y-6 animate-fade-up">
		<div>
			<h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Perfil</h2>
			{#if $auth}
				<div class="space-y-3">
					<div>
						<p class="text-xs text-muted mb-1">Nome</p>
						<p class="text-text-primary">{$auth.first_name} {$auth.last_name}</p>
					</div>
					<div>
						<p class="text-xs text-muted mb-1">Email</p>
						<p class="text-text-primary">{$auth.email}</p>
					</div>
					<div>
						<p class="text-xs text-muted mb-1">Função</p>
						<p class="text-text-primary capitalize">{$auth.role}</p>
					</div>
				</div>
			{/if}
		</div>

		<div class="border-t border-border"></div>

		<div>
			<h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Preferências</h2>
			<div class="space-y-4">
				<div>
					<label for="tz-select" class="block text-sm text-muted mb-1">Fuso horário</label>
					<div class="flex gap-3">
						<select
							id="tz-select"
							bind:value={selectedTimezone}
							class="flex-1 bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
						>
							{#each TIMEZONES as tz}
								<option value={tz.value}>{tz.label}</option>
							{/each}
						</select>
						<button
							onclick={saveTimezone}
							class="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors shrink-0"
						>
							Salvar
						</button>
					</div>
					{#if saved}
						<p class="text-xs text-accent mt-1">Fuso horário salvo!</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="border-t border-border"></div>

		<div>
			<h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Notificações</h2>
			<p class="text-text-secondary text-sm">Em breve: alertas de vencimento, limites...</p>
		</div>
	</div>
</div>
