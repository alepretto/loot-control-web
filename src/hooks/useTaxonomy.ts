import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagFamiliesApi, categoriesApi, tagsApi } from '@/lib/api';

// ==========================================
// TAG FAMILIES (Taxonomia)
// ==========================================
const FAMILIES_KEY = 'tagFamilies';

export function useTagFamilies() {
  return useQuery({
    queryKey: [FAMILIES_KEY],
    queryFn: () => tagFamiliesApi.list(),
    // Cache muito longo - famílias raramente mudam
    staleTime: 1000 * 60 * 30, // 30 minutos
    gcTime: 1000 * 60 * 60,    // 1 hora
  });
}

export function useCreateTagFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tagFamiliesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FAMILIES_KEY] });
    },
  });
}

// ==========================================
// CATEGORIES
// ==========================================
const CATEGORIES_KEY = 'categories';

export function useCategories() {
  return useQuery({
    queryKey: [CATEGORIES_KEY],
    queryFn: () => categoriesApi.list(),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
  });
}

export function useCategoriesByFamily(familyId: string) {
  return useQuery({
    queryKey: [CATEGORIES_KEY, { family_id: familyId }],
    queryFn: () => categoriesApi.list({ family_id: familyId }),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 15,
  });
}

// ==========================================
// TAGS
// ==========================================
const TAGS_KEY = 'tags';

export function useTags() {
  return useQuery({
    queryKey: [TAGS_KEY],
    queryFn: () => tagsApi.list(),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 20,
  });
}

export function useTagsByCategory(categoryId: string) {
  return useQuery({
    queryKey: [TAGS_KEY, { category_id: categoryId }],
    queryFn: () => tagsApi.list({ category_id: categoryId }),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 10,
  });
}

// Hook combinado para toda a taxonomia (usado em formulários)
export function useTaxonomy() {
  const families = useTagFamilies();
  const categories = useCategories();
  const tags = useTags();
  
  return {
    families: families.data ?? [],
    categories: categories.data ?? [],
    tags: tags.data ?? [],
    isLoading: families.isLoading || categories.isLoading || tags.isLoading,
    error: families.error || categories.error || tags.error,
  };
}
