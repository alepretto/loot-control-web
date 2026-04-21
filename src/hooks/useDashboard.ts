import { useQueries } from '@tanstack/react-query';
import { 
  accountsApi, 
  creditCardsApi, 
  invoicesApi, 
  liabilitiesApi, 
  netWorthApi,
  budgetsApi,
  transactionsApi,
  recurrencesApi,
} from '@/lib/api';

// Hook para carregar todos os dados do Dashboard em paralelo
export function useDashboardData() {
  return useQueries({
    queries: [
      {
        queryKey: ['dashboard', 'accounts'],
        queryFn: () => accountsApi.list({ is_active: true }),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['dashboard', 'creditCards'],
        queryFn: () => creditCardsApi.list({ is_active: true }),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['dashboard', 'invoices'],
        queryFn: () => invoicesApi.list(),
        staleTime: 1000 * 60 * 2,
      },
      {
        queryKey: ['dashboard', 'liabilities'],
        queryFn: () => liabilitiesApi.list({ is_active: true }),
        staleTime: 1000 * 60 * 10,
      },
      {
        queryKey: ['dashboard', 'netWorth'],
        queryFn: () => netWorthApi.current(),
        staleTime: 1000 * 60 * 2,
      },
      {
        queryKey: ['dashboard', 'budgets'],
        queryFn: () => budgetsApi.list({ is_active: true }),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['dashboard', 'recentTransactions'],
        queryFn: () => transactionsApi.list({ page_size: 10 }),
        staleTime: 1000 * 60 * 1,
      },
      {
        queryKey: ['dashboard', 'upcomingRecurrences'],
        queryFn: () => recurrencesApi.list({ is_active: true }),
        staleTime: 1000 * 60 * 5,
      },
    ],
  });
}

// Hook para dados do Patrimônio
export function useNetWorthData() {
  return useQueries({
    queries: [
      {
        queryKey: ['networth', 'accounts'],
        queryFn: () => accountsApi.list({ is_active: true }),
        staleTime: 1000 * 60 * 10,
      },
      {
        queryKey: ['networth', 'liabilities'],
        queryFn: () => liabilitiesApi.list({ is_active: true }),
        staleTime: 1000 * 60 * 10,
      },
      {
        queryKey: ['networth', 'creditCards'],
        queryFn: () => creditCardsApi.list({ is_active: true }),
        staleTime: 1000 * 60 * 10,
      },
      {
        queryKey: ['networth', 'invoices'],
        queryFn: () => invoicesApi.list(),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['networth', 'history'],
        queryFn: () => netWorthApi.history(12),
        staleTime: 1000 * 60 * 30, // Cache longo - histórico não muda
      },
    ],
  });
}
