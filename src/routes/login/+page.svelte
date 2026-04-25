<script lang="ts">
	import { login, signup, setToken } from '$lib/api';
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	let mode = $state<'login' | 'signup'>('login');
	let email = $state('');
	let password = $state('');
	let first_name = $state('');
	let last_name = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			if (mode === 'login') {
				const token = await login({ email, password });
				setToken(token.access_token);
			} else {
				await signup({ first_name, last_name, email, password });
				// After signup, login automatically
				const token = await login({ email, password });
				setToken(token.access_token);
			}
			await auth.load();
			goto('/contas');
		} catch (e: any) {
			error = e.message || 'Algo deu errado';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-dot-grid flex items-center justify-center p-4">
	<div class="w-full max-w-sm">
		<div class="bg-surface border border-border rounded-2xl p-6 shadow-2xl animate-fade-up">
			<div class="text-center mb-6">
				<h1 class="text-2xl font-bold text-text-primary">
					{mode === 'login' ? 'Entrar' : 'Criar conta'}
				</h1>
				<p class="text-muted text-sm mt-1">
					{mode === 'login' ? 'Acesse sua conta' : 'Comece a controlar suas finanças'}
				</p>
			</div>

			{#if error}
				<div class="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 mb-4 text-sm">
					{error}
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-4">
				{#if mode === 'signup'}
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="first_name" class="block text-sm text-muted mb-1">Nome</label>
							<input
								id="first_name"
								type="text"
								bind:value={first_name}
								required
								class="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
								placeholder="João"
							/>
						</div>
						<div>
							<label for="last_name" class="block text-sm text-muted mb-1">Sobrenome</label>
							<input
								id="last_name"
								type="text"
								bind:value={last_name}
								required
								class="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
								placeholder="Silva"
							/>
						</div>
					</div>
				{/if}

				<div>
					<label for="email" class="block text-sm text-muted mb-1">Email</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						class="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
						placeholder="seu@email.com"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm text-muted mb-1">Senha</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						minlength={6}
						class="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
						placeholder="••••••••"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full bg-primary hover:bg-primary-hover text-white rounded-lg py-2.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
				</button>
			</form>

			<div class="mt-4 text-center">
				<button
					onclick={() => { mode = mode === 'login' ? 'signup' : 'login'; error = ''; }}
					class="text-sm text-muted hover:text-text-primary transition-colors"
				>
					{mode === 'login' ? 'Não tem uma conta? Criar' : 'Já tem uma conta? Entrar'}
				</button>
			</div>

			{#if mode === 'login'}
				<div class="mt-3 text-center">
					<button
						class="text-xs text-text-secondary hover:text-muted transition-colors"
						title="Funcionalidade em breve"
						disabled
					>
						Esqueci minha senha
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>