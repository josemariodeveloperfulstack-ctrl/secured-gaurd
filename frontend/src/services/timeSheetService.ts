import api from '@/lib/axios';

class TimeSheetService {
  async downloadTimeSheet(employeeId: string, year?: number, month?: number) {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;

    const response = await api.get(`/api/time-sheets/${employeeId}`, {
      params,
      responseType: 'blob',
    });

    return response.data as Blob;
  }

  /**
   * Baixa o PDF da folha de ponto do mês preenchido com os registros do funcionário.
   */
  async downloadMonthFolhaPontoPdf(
    employeeId: string,
    year?: number,
    month?: number,
    companyId?: string
  ): Promise<Blob> {
    const params: Record<string, string | number> = { employeeId };
    if (year != null) params.year = year;
    if (month != null) params.month = month;
    if (companyId) params.companyId = companyId;

    const response = await api.get('/api/time-sheets/month-pdf', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  /**
   * Baixa o PDF da folha de ponto em branco para impressão e preenchimento manual
   * (layout padronizado, qualquer mês/ano).
   */
  async downloadBlankFolhaPontoPdf(year?: number, month?: number, companyId?: string): Promise<Blob> {
    const params: Record<string, string | number> = {};
    if (year != null) params.year = year;
    if (month != null) params.month = month;
    if (companyId) params.companyId = companyId;

    const response = await api.get('/api/time-sheets/blank-pdf', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  }
}

export const timeSheetService = new TimeSheetService();



