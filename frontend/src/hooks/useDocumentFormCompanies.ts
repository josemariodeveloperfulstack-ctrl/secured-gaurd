import { useEffect, useMemo, useState } from 'react';
import { useCompanies } from '@/hooks/queries/useCompanies';
import { companyService } from '@/services/companyService';
import type { Company } from '@/types/company';
import { fetchWithConnectionRetry } from '@/utils/connectionError';

/**
 * Empresas para formulários de documentos dentro do modal de funcionário.
 * Reutiliza lista do pai quando disponível; senão usa cache React Query.
 * Garante que a empresa do funcionário apareça mesmo se /companies falhar parcialmente.
 */
export function useDocumentFormCompanies(companyId?: string, parentCompanies?: Company[]) {
  const hasParentList = Boolean(parentCompanies && parentCompanies.length > 0);
  const { data: queried = [], isLoading, refetch } = useCompanies({
    enabled: !hasParentList,
  });

  const baseCompanies = hasParentList ? parentCompanies! : queried;
  const [extraCompany, setExtraCompany] = useState<Company | null>(null);

  useEffect(() => {
    const normalizedId = String(companyId ?? '').trim();
    if (!normalizedId) {
      setExtraCompany(null);
      return;
    }

    const found = baseCompanies.some((c) => String(c.id) === normalizedId);
    if (found) {
      setExtraCompany(null);
      return;
    }

    let cancelled = false;
    fetchWithConnectionRetry(() => companyService.getCompanyById(normalizedId), 2)
      .then((company) => {
        if (!cancelled && company) {
          setExtraCompany(company as Company);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExtraCompany(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, baseCompanies]);

  const companies = useMemo(() => {
    if (!extraCompany) {
      return baseCompanies;
    }
    if (baseCompanies.some((c) => String(c.id) === String(extraCompany.id))) {
      return baseCompanies;
    }
    return [...baseCompanies, extraCompany];
  }, [baseCompanies, extraCompany]);

  return {
    companies,
    loadingCompanies: !hasParentList && isLoading,
    refetchCompanies: refetch,
  };
}
