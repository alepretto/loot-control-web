<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import { User, Globe, Bell, Shield, Clock, Mail, CheckCircle2, Lock } from 'lucide-svelte';

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

	let userInitials = $derived(
		$auth
			? ($auth.first_name.charAt(0) + $auth.last_name.charAt(0)).toUpperCase()
			: '??'
	);

	let roleLabel = $derived(
		$auth?.role === 'admin' ? 'Administrador' : 'Usuário'
	);

	let roleColor = $derived(
		$auth?.role === 'admin' ? '#2563eb' : '#22c55e'
	);

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
	<!-- Header -->
	<div class="animate-fade-up">
		<h1 class="text-xl font-bold text-text-primary">Configurações</h1>
		<p class="text-sm text-muted mt-0.5">Gerencie suas preferências</p>
	</div>

	{#if $auth}
		<!-- Profile Card -->
		<div class="bg-surface border border-border/50 rounded-xl overflow-hidden animate-fade-up" style="animation-delay: 70ms;">
			<!-- Gradient banner -->
			<div class="h-24 relative" style="background: linear-gradient(135deg, {$auth.role === 'admin' ? '#2563eb' : '#22c55e'}15 0%, {$auth.role === 'admin' ? '#2563eb' : '#22c55e'}30 100%);">
				<div class="absolute inset-0" style="background: radial-gradient(circle at 30% 50%, {$auth.role === 'admin' ? '#2563eb' : '#22c55e'}12, transparent 70%);"></div>
			</div>

			<!-- Profile content -->
			<div class="px-5 pb-5 -mt-10">
				<div class="flex items-end gap-4 mb-4">
					<!-- Avatar with initials -->
					<div
						class="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold border-4 border-surface shrink-0 transition-transform duration-200 hover:scale-105"
						style="background: linear-gradient(135deg, {roleColor}18 0%, {roleColor}40 100%); color: {roleColor}; box-shadow: 0 0 24px {roleColor}15;"
					>
						{userInitials}
					</div>
					<div class="pb-1 min-w-0 flex-1">
						<h2 class="text-lg font-bold text-text-primary truncate">{$auth.first_name} {$auth.last_name}</h2>
						<div class="flex items-center gap-2 mt-0.5">
							<span
								class="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md"
								style="background-color: {roleColor}15; color: {roleColor}"
							>
								<span class="w-1.5 h-1.5 rounded-full inline-block" style="background-color: {roleColor}"></span>
								{roleLabel}
							</span>
							{#if $auth.is_active}
								<span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#22c55e]/12 text-[#22c55e]">
									<span class="w-1.5 h-1.5 rounded-full inline-block bg-[#22c55e]"></span>
									Ativo
								</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Info grid -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="flex items-center gap-3 bg-surface-2/50 border border-border/40 rounded-xl px-4 py-3">
						<div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
							<Mail class="w-4 h-4" />
						</div>
						<div class="min-w-0">
							<p class="text-[11px] text-muted uppercase tracking-wider">Email</p>
							<p class="text-sm text-text-primary truncate">{$auth.email}</p>
						</div>
					</div>
					<div class="flex items-center gap-3 bg-surface-2/50 border border-border/40 rounded-xl px-4 py-3">
						<div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
							<Shield class="w-4 h-4" />
						</div>
						<div class="min-w-0">
							<p class="text-[11px] text-muted uppercase tracking-wider">Função</p>
							<p class="text-sm text-text-primary capitalize">{$auth.role}</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Timezone Section -->
		<div class="bg-surface border border-border/50 rounded-xl p-5 animate-fade-up" style="animation-delay: 140ms;">
			<div class="flex items-center gap-2.5 mb-4">
				<div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
					<Globe class="w-4 h-4" />
				</div>
				<div>
					<h2 class="text-sm font-semibold text-text-primary">Fuso horário</h2>
					<p class="text-[11px] text-muted">Defina o fuso horário para exibição de datas</p>
				</div>
			</div>

			<div class="space-y-3">
				<div>
					<label for="tz-select" class="block text-xs text-muted mb-1.5">Selecione o fuso horário</label>
					<div class="flex gap-3">
						<div class="relative flex-1">
							<div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
								<Clock class="w-4 h-4" />
							</div>
							<select
								id="tz-select"
								bind:value={selectedTimezone}
								class="w-full bg-surface-3 border border-border/70 rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all appearance-none cursor-pointer"
							>
								{#each TIMEZONES as tz}
									<option value={tz.value}>{tz.label}</option>
								{/each}
							</select>
						</div>
						<button
							onclick={saveTimezone}
							class="bg-primary hover:bg-primary-hover text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98] shrink-0"
						>
							Salvar
						</button>
					</div>
				</div>
				{#if saved}
					<div class="flex items-center gap-1.5 text-accent text-xs animate-fade-in">
						<CheckCircle2 class="w-3.5 h-3.5" />
						Fuso horário salvo!
					</div>
				{/if}
			</div>
		</div>

		<!-- Notifications Section -->
		<div class="bg-surface border border-border/50 rounded-xl p-5 animate-fade-up" style="animation-delay: 210ms;">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-lg flex items-center justify-center bg-[#f59e0b]/10 text-[#f59e0b]">
						<Bell class="w-4 h-4" />
					</div>
					<div>
						<h2 class="text-sm font-semibold text-text-primary">Notificações</h2>
						<p class="text-[11px] text-muted">Alertas e lembretes</p>
					</div>
				</div>
				<span class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#f59e0b]/12 text-[#f59e0b] uppercase tracking-wider">Em breve</span>
			</div>

			<div class="space-y-3">
				<!-- Notification toggle placeholder -->
				<div class="flex items-center justify-between bg-surface-2/50 border border-border/40 rounded-xl px-4 py-3.5 opacity-60">
					<div class="flex items-center gap-3">
						<div class="w-2 h-2 rounded-full bg-muted/50"></div>
						<div>
							<p class="text-sm text-text-primary">Vencimento de faturas</p>
							<p class="text-[11px] text-muted">Receba alertas antes do vencimento</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<Lock class="w-3.5 h-3.5 text-muted/50" />
						<div class="w-9 h-5 rounded-full bg-surface-3 border border-border/50 relative cursor-not-allowed">
							<div class="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-muted/40 transition-all"></div>
						</div>
					</div>
				</div>

				<!-- Notification toggle placeholder -->
				<div class="flex items-center justify-between bg-surface-2/50 border border-border/40 rounded-xl px-4 py-3.5 opacity-60">
					<div class="flex items-center gap-3">
						<div class="w-2 h-2 rounded-full bg-muted/50"></div>
						<div>
							<p class="text-sm text-text-primary">Limites de gastos</p>
							<p class="text-[11px] text-muted">Alertas ao atingir metas definidas</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<Lock class="w-3.5 h-3.5 text-muted/50" />
						<div class="w-9 h-5 rounded-full bg-surface-3 border border-border/50 relative cursor-not-allowed">
							<div class="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-muted/40 transition-all"></div>
						</div>
					</div>
				</div>

				<!-- Notification toggle placeholder -->
				<div class="flex items-center justify-between bg-surface-2/50 border border-border/40 rounded-xl px-4 py-3.5 opacity-60">
					<div class="flex items-center gap-3">
						<div class="w-2 h-2 rounded-full bg-muted/50"></div>
						<div>
							<p class="text-sm text-text-primary">Resumo mensal</p>
							<p class="text-[11px] text-muted">Relatório mensal por email</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<Lock class="w-3.5 h-3.5 text-muted/50" />
						<div class="w-9 h-5 rounded-full bg-surface-3 border border-border/50 relative cursor-not-allowed">
							<div class="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-muted/40 transition-all"></div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Account Section -->
		<div class="bg-surface border border-border/50 rounded-xl p-5 animate-fade-up" style="animation-delay: 280ms;">
			<div class="flex items-center gap-2.5 mb-4">
				<div class="w-8 h-8 rounded-lg flex items-center justify-center bg-[#8b5cf6]/10 text-[#8b5cf6]">
					<User class="w-4 h-4" />
				</div>
				<div>
					<h2 class="text-sm font-semibold text-text-primary">Conta</h2>
					<p class="text-[11px] text-muted">Informações da sua conta</p>
				</div>
			</div>

			<div class="space-y-2">
				<div class="flex items-center justify-between bg-surface-2/50 border border-border/40 rounded-xl px-4 py-3">
					<span class="text-sm text-muted">ID da conta</span>
					<span class="text-sm text-text-primary font-data truncate ml-4">{$auth.id.slice(0, 8)}...</span>
				</div>
				<div class="flex items-center justify-between bg-surface-2/50 border border-border/40 rounded-xl px-4 py-3">
					<span class="text-sm text-muted">Status</span>
					<span class="inline-flex items-center gap-1.5 text-sm">
						{#if $auth.is_active}
							<span class="w-2 h-2 rounded-full bg-[#22c55e]"></span>
							<span class="text-[#22c55e] font-medium">Ativo</span>
						{:else}
							<span class="w-2 h-2 rounded-full bg-danger"></span>
							<span class="text-danger font-medium">Inativo</span>
						{/if}
					</span>
				</div>
				<div class="flex items-center justify-between bg-surface-2/50 border border-border/40 rounded-xl px-4 py-3">
					<span class="text-sm text-muted">Nível de acesso</span>
					<span
						class="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md"
						style="background-color: {roleColor}15; color: {roleColor}"
					>
						<span class="w-1.5 h-1.5 rounded-full inline-block" style="background-color: {roleColor}"></span>
						{roleLabel}
					</span>
				</div>
			</div>
		</div>
	{/if}
</div>