// Exporta todos os hooks de API com React Query caching

// Transações
export {
  useTransactions,
  useTransaction,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from './useTransactions';

// Contas, métodos de pagamento, cartões, faturas
export {
  useAccounts,
  usePaymentMethods,
  useCreditCards,
  useInvoices,
  usePayInvoice,
  useCreateAccount,
} from './useFinance';

// Taxonomia (tags, categorias, famílias)
export {
  useTagFamilies,
  useCategories,
  useTags,
  useCategoriesByFamily,
  useTagsByCategory,
  useTaxonomy,
  useCreateTagFamily,
} from './useTaxonomy';

// Dashboard
export {
  useDashboardData,
  useNetWorthData,
} from './useDashboard';
