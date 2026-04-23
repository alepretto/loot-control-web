<script lang="ts">
	import { auth } from '$lib/stores/auth';
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
			<p class="text-text-secondary text-sm">Em breve: tema, idioma, moeda padrão...</p>
		</div>

		<div class="border-t border-border"></div>

		<div>
			<h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Notificações</h2>
			<p class="text-text-secondary text-sm">Em breve: alertas de vencimento, limites...</p>
		</div>
	</div>
</div>