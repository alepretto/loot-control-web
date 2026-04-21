import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi, paymentMethodsApi, creditCardsApi, invoicesApi } from '@/lib/api';

// ==========================================
// ACCOUNTS
// ==========================================
const ACCOUNTS_KEY = 'accounts';

export function useAccounts(isActive = true) {
  return useQuery({
    queryKey: [ACCOUNTS_KEY, { is_active: isActive }],
    queryFn: () => accountsApi.list({ is_active: isActive }),
    // Cache longo - contas mudam pouco
    staleTime: 1000 * 60 * 10, // 10 minutos
    gcTime: 1000 * 60 * 30,    // 30 minutos
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}

// ==========================================
// PAYMENT METHODS
// ==========================================
const PAYMENT_METHODS_KEY = 'paymentMethods';

export function usePaymentMethods(isActive = true) {
  return useQuery({
    queryKey: [PAYMENT_METHODS_KEY, { is_active: isActive }],
    queryFn: () => paymentMethodsApi.list({ is_active: isActive }),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

// ==========================================
// CREDIT CARDS
// ==========================================
const CREDIT_CARDS_KEY = 'creditCards';

export function useCreditCards(isActive = true) {
  return useQuery({
    queryKey: [CREDIT_CARDS_KEY, { is_active: isActive }],
    queryFn: () => creditCardsApi.list({ is_active: isActive }),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

// ==========================================
// INVOICES
// ==========================================
const INVOICES_KEY = 'invoices';

export function useInvoices(creditCardId?: string, status?: string) {
  return useQuery({
    queryKey: [INVOICES_KEY, { credit_card_id: creditCardId, status }],
    queryFn: () => invoicesApi.list({ credit_card_id: creditCardId, status: status as any }),
    staleTime: 1000 * 60 * 3, // 3 minutos
    gcTime: 1000 * 60 * 10,
    enabled: !!creditCardId || status === undefined,
  });
}

export function usePayInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, accountId }: { invoiceId: string; accountId: string }) =>
      invoicesApi.pay(invoiceId, { payment_account_id: accountId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
    },
  });
}
