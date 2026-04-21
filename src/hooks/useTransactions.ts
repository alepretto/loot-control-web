import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, Transaction, TransactionFilter } from '@/lib/api';

const TRANSACTIONS_KEY = 'transactions';

// Hook para listar transações com caching
export function useTransactions(filters?: TransactionFilter) {
  return useQuery({
    queryKey: [TRANSACTIONS_KEY, filters],
    queryFn: () => transactionsApi.list(filters || {}),
    // Cache mais curto para transações (mudam frequentemente)
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 5,    // 5 minutos
  });
}

// Hook para buscar uma transação específica
export function useTransaction(id: string) {
  return useQuery({
    queryKey: [TRANSACTIONS_KEY, id],
    queryFn: () => transactionsApi.get(id),
    enabled: !!id,
  });
}

// Hook para criar transação
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      // Invalida o cache de transações após criar
      queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
    },
  });
}

// Hook para atualizar transação
export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) =>
      transactionsApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalida cache específico e lista
      queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
    },
  });
}

// Hook para deletar transação
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
    },
  });
}
