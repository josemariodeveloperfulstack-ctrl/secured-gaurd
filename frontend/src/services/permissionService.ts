import api from '@/lib/axios';
import { PermissionDTO } from '@/types/user';
import { generatePermissions } from '@/utils/permissions';

export const permissionService = {
  async getAllPermissions(): Promise<PermissionDTO[]> {
    const response = await api.get('/permissions');
    const permissions: PermissionDTO[] = response.data || [];

    // Lista de nomes de permissões válidas, baseada no modelo atual do sistema
    const allPermissionKeys = Object.keys(generatePermissions('SUPER_ADMIN')) as string[];
    const validPermissionNames = new Set(allPermissionKeys);

    // 1) Filtrar apenas permissões que existem no modelo atual (evita permissões legadas)
    const filtered = permissions.filter((p) => validPermissionNames.has(p.name));

    // 2) Remover duplicadas por nome (mantém a primeira com descrição não vazia)
    const uniqueByName = new Map<string, PermissionDTO>();
    for (const perm of filtered) {
      const existing = uniqueByName.get(perm.name);
      if (!existing) {
        uniqueByName.set(perm.name, perm);
      } else if ((!existing.description || existing.description.trim() === '') && perm.description) {
        uniqueByName.set(perm.name, perm);
      }
    }

    return Array.from(uniqueByName.values());
  },
}; 