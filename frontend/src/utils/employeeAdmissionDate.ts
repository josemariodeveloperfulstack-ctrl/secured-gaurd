/**
 * Converte hireDate do cadastro para formato ISO (yyyy-MM-dd) usado nos formulários de documentos.
 */
export function employeeAdmissionIsoDate(hireDate?: string | null): string | undefined {
  if (!hireDate) return undefined;
  return hireDate.split('T')[0];
}

/**
 * Retorna a data de admissão ou a data atual como fallback (yyyy-MM-dd).
 */
export function employeeAdmissionIsoDateOrToday(hireDate?: string | null): string {
  return employeeAdmissionIsoDate(hireDate) ?? new Date().toISOString().split('T')[0];
}
