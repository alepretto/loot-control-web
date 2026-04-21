'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

// Configuração otimizada para Supabase Free Tier
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache por 5 minutos (reduz requisições ao Supabase)
        staleTime: 1000 * 60 * 5, // 5 minutos
        
        // Dados ficam em cache por 10 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos
        
        // Refetch automático em background quando volta foco (mas não muito agressivo)
        refetchOnWindowFocus: false,
        
        // Refetch quando reconecta (útil se conexão cair)
        refetchOnReconnect: true,
        
        // Não refetch em mount se dados estão fresh (evita requisições duplicadas)
        refetchOnMount: false,
        
        // Retry com backoff exponencial (evita floodar o Supabase)
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        
        // Placeholder data (mostra cache imediatamente)
        placeholderData: (previousData: unknown) => previousData,
      },
      mutations: {
        // Retry em mutações também
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
