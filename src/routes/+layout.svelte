<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>Loot Control</title>
	<meta property="og:title" content="Loot Control" />
	<meta property="og:description" content="Controle financeiro pessoal com estilo — gerencie contas, investimentos e muito mais" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Loot Control" />
	<meta name="twitter:description" content="Controle financeiro pessoal com estilo — gerencie contas, investimentos e muito mais" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children()}