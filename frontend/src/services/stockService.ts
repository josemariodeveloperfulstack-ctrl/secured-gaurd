import api from '@/lib/axios';
import {
  StockItem,
  StockMovement,
  StockAlert,
  CreateStockItemDTO,
  CreateStockMovementDTO,
  StockFilters,
  MovementFilters,
  StockReport,
  StockCategory,
  MovementType,
  MovementReason,
  StorageShelf,
  StockItemLocation,
  SignatureType,
  RequisitionSentType,
  PhysicalInventoryImportResult,
  InventoryRequisitionSummary,
  StockRequisitionDTO,
  CreateStockRequisitionPayload,
  DeliverStockRequisitionPayload,
  StockRequisitionListItem,
  LocationStockSummaryRow
} from '@/types/stock';

function parseNumberField(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Normaliza campos numéricos e nomes alternativos vindos do JSON (evita estoque "0" na UI por campo errado). */
export function normalizeStockItem(raw: Record<string, unknown>): StockItem {
  const cur = raw.currentQuantity ?? raw.current_quantity;
  const min = raw.minimumQuantity ?? raw.minimum_quantity;
  const low = raw.isLowStock ?? raw.is_low_stock;
  const fn = raw.fullName ?? raw.full_name;
  const uc = raw.unitCost ?? raw.unit_cost;
  const puc = raw.previousUnitCost ?? raw.previous_unit_cost;
  const base = raw as unknown as StockItem;
  const nameStr = typeof raw.name === 'string' ? raw.name : '';
  const fullNameStr =
    typeof fn === 'string' && fn.trim() !== ''
      ? fn
      : typeof base.fullName === 'string' && base.fullName
        ? base.fullName
        : nameStr;
  let locations = base.locations;
  const locRaw = raw.locations;
  if (Array.isArray(locRaw) && locRaw.length > 0) {
    locations = locRaw.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id ?? ''),
        shelfId: String(r.shelfId ?? r.shelf_id ?? ''),
        shelfIdentification: String(r.shelfIdentification ?? r.shelf_identification ?? ''),
        floor: String(r.floor ?? ''),
        quantity: parseNumberField(r.quantity)
      };
    });
  }
  return {
    ...base,
    currentQuantity: (() => {
      const fromField = parseNumberField(
        cur ?? raw.currentStock ?? raw.current_stock ?? raw.quantity,
      );
      const locSum = Array.isArray(locations)
        ? locations.reduce((sum, loc) => sum + (Number(loc.quantity) || 0), 0)
        : 0;
      // Preferir soma das localizações quando houver (verdade física do almoxarifado)
      if (locSum > 0) return locSum;
      return fromField;
    })(),
    minimumQuantity: typeof min === 'number' && !Number.isNaN(min) ? min : Number(min) || 0,
    isLowStock: Boolean(low),
    fullName: fullNameStr,
    unitCost: parseNumberField(uc),
    previousUnitCost: (() => {
      const n = parseNumberField(puc);
      return n > 0 ? n : undefined;
    })(),
    locations
  };
}

function normalizeStockReportPayload(raw: Record<string, unknown>): StockReport {
  const low = raw.lowStockItems ?? raw.low_stock_items;
  const out = raw.outOfStockItems ?? raw.out_of_stock_items;
  const ibc = raw.itemsByCategory ?? raw.items_by_category;
  return {
    totalItems: parseNumberField(raw.totalItems ?? raw.total_items),
    lowStockCount: parseNumberField(raw.lowStockCount ?? raw.low_stock_count),
    outOfStockCount: parseNumberField(raw.outOfStockCount ?? raw.out_of_stock_count),
    totalValue: parseNumberField(raw.totalValue ?? raw.total_value),
    totalQuantity: parseNumberField(raw.totalQuantity ?? raw.total_quantity),
    itemsByCategory:
      ibc && typeof ibc === 'object' && !Array.isArray(ibc) ? (ibc as Record<string, number>) : {},
    activeAlerts: parseNumberField(raw.activeAlerts ?? raw.active_alerts),
    criticalAlerts: parseNumberField(raw.criticalAlerts ?? raw.critical_alerts),
    lowStockItems: Array.isArray(low) ? low.map((row) => normalizeStockItem(row as Record<string, unknown>)) : [],
    outOfStockItems: Array.isArray(out) ? out.map((row) => normalizeStockItem(row as Record<string, unknown>)) : []
  };
}

export const stockService = {
  // ===== ITENS DE ESTOQUE =====

  async getAllItems(): Promise<StockItem[]> {
    const response = await api.get<StockItem[]>('/api/stock/items');
    const data = response.data;
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map((row) => normalizeStockItem(row as unknown as Record<string, unknown>));
  },

  async searchItems(filters: StockFilters, page = 0, size = 20): Promise<{ content: StockItem[], totalElements: number }> {
    try {
      const params = new URLSearchParams();

      if (filters.category) params.append('category', filters.category);
      if (filters.active !== undefined) params.append('active', filters.active.toString());
      if (filters.unitId) params.append('unitId', filters.unitId);
      if (filters.lowStock !== undefined) params.append('lowStock', filters.lowStock.toString());
      if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);

      params.append('page', page.toString());
      params.append('size', size.toString());

      const response = await api.get<{ content: StockItem[]; totalElements: number }>(
        `/api/stock/items/search?${params.toString()}`
      );
      const body = response.data;
      if (!body?.content) {
        return { content: [], totalElements: 0 };
      }
      return {
        ...body,
        content: body.content.map((row) => normalizeStockItem(row as unknown as Record<string, unknown>)),
      };
    } catch (error) {
      console.error('Erro ao buscar itens com filtros:', error);
      throw new Error('Falha ao buscar itens');
    }
  },

  async getItemById(id: string): Promise<StockItem> {
    try {
      const response = await api.get(`/api/stock/items/${id}`);
      return normalizeStockItem(response.data as unknown as Record<string, unknown>);
    } catch (error) {
      console.error('Erro ao buscar item por ID:', error);
      throw new Error('Falha ao buscar item');
    }
  },

  async getItemByCode(code: string): Promise<StockItem> {
    try {
      const response = await api.get(`/api/stock/items/code/${code}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar item por código:', error);
      throw new Error('Falha ao buscar item por código');
    }
  },

  async getItemByQrCode(qrCode: string): Promise<StockItem> {
    try {
      const response = await api.get(`/api/stock/items/qr/${qrCode}`);
      return normalizeStockItem(response.data as unknown as Record<string, unknown>);
    } catch (error) {
      console.error('Erro ao buscar item por QR Code:', error);
      throw new Error('Falha ao buscar item por QR Code');
    }
  },

  async adjustInventoryViaQrCode(qrCode: string, physicalQuantity: number): Promise<any> {
    try {
      const response = await api.patch(`/api/stock/items/qr/${qrCode}/inventory-adjust`, {
        physicalQuantity
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao ajustar inventário via QR Code:', error);
      throw new Error(error?.response?.data?.message || 'Falha ao ajustar inventário');
    }
  },

  async createItem(itemData: CreateStockItemDTO): Promise<StockItem> {
    try {
      const response = await api.post('/api/stock/items', itemData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar item:', error);
      throw new Error('Falha ao criar item');
    }
  },

  async updateItem(id: string, itemData: Partial<CreateStockItemDTO>): Promise<StockItem> {
    try {
      const response = await api.put(`/api/stock/items/${id}`, itemData);
      return normalizeStockItem(response.data as unknown as Record<string, unknown>);
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      throw new Error('Falha ao atualizar item');
    }
  },

  async deleteItem(id: string): Promise<void> {
    try {
      await api.delete(`/api/stock/items/${id}`);
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      throw new Error('Falha ao excluir item');
    }
  },

  async getItemsByCategory(category: StockCategory): Promise<StockItem[]> {
    try {
      const response = await api.get(`/api/stock/items/category/${category}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar itens por categoria:', error);
      throw new Error('Falha ao buscar itens por categoria');
    }
  },

  async getLowStockItems(): Promise<StockItem[]> {
    try {
      const response = await api.get('/api/stock/items/low-stock');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar itens com baixo estoque:', error);
      throw new Error('Falha ao buscar itens com baixo estoque');
    }
  },

  // ===== MOVIMENTAÇÕES =====

  async createMovement(movementData: CreateStockMovementDTO): Promise<StockMovement> {
    try {
      console.log('📤 Enviando requisição para /api/stock/movements:', movementData);
      const response = await api.post('/api/stock/movements', movementData);
      console.log('✅ Resposta recebida:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao criar movimentação:', error);
      console.error('❌ Response data:', error?.response?.data);
      console.error('❌ Response status:', error?.response?.status);
      console.error('❌ Response headers:', error?.response?.headers);
      const errorMessage = error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Falha ao criar movimentação';
      throw new Error(errorMessage);
    }
  },

  async searchMovements(filters: MovementFilters, page = 0, size = 20): Promise<{ content: StockMovement[], totalElements: number }> {
    try {
      const params = new URLSearchParams();

      if (filters.stockItemId) params.append('stockItemId', filters.stockItemId);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.movementType) params.append('movementType', filters.movementType);
      if (filters.reason) params.append('reason', filters.reason);
      if (filters.unitId) params.append('unitId', filters.unitId);

      // Converter datas do formato dd/mm/aaaa para ISO DateTime
      if (filters.startDate) {
        const isoStartDate = this.convertDateToISO(filters.startDate, true);
        if (isoStartDate) {
          params.append('startDate', isoStartDate);
        }
      }
      if (filters.endDate) {
        const isoEndDate = this.convertDateToISO(filters.endDate, false);
        if (isoEndDate) {
          params.append('endDate', isoEndDate);
        }
      }

      if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);
      if (filters.requisitionNumber) params.append('requisitionNumber', filters.requisitionNumber.trim());

      params.append('page', page.toString());
      params.append('size', size.toString());

      const response = await api.get(`/api/stock/movements/search?${params.toString()}`);
      return {
        content: response.data.content || [],
        totalElements: response.data.totalElements || 0
      };
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      // Return empty result instead of throwing error
      return {
        content: [],
        totalElements: 0
      };
    }
  },

  async importPhysicalInventory(file: File): Promise<PhysicalInventoryImportResult> {
    const form = new FormData();
    form.append('file', file);
    // Não definir Content-Type manualmente: o browser/axios precisa incluir o boundary no multipart.
    const response = await api.post<PhysicalInventoryImportResult>(
      '/api/stock/import/physical-inventory',
      form
    );
    return response.data;
  },

  /** Inventário por item: zera estoque de todos os itens ativos e aplica cada linha da planilha (código, item, categoria, estoque…). */
  async importItemInventory(file: File): Promise<PhysicalInventoryImportResult> {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post<PhysicalInventoryImportResult>(
      '/api/stock/import/item-inventory',
      form
    );
    return response.data;
  },

  async listInventoryRequisitions(start?: string, end?: string): Promise<InventoryRequisitionSummary[]> {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const q = params.toString();
    const response = await api.get<InventoryRequisitionSummary[]>(
      `/api/stock/inventory-requisitions${q ? `?${q}` : ''}`
    );
    return response.data || [];
  },

  // Função auxiliar para converter data dd/mm/aaaa para ISO DateTime
  convertDateToISO(dateString: string, isStartDate: boolean): string | null {
    if (!dateString) return null;

    try {
      // Tentar parsear formato dd/mm/aaaa
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
        const year = parseInt(parts[2], 10);

        const date = new Date(year, month, day);
        if (isNaN(date.getTime())) {
          console.warn('Data inválida:', dateString);
          return null;
        }

        // Se for data inicial, usar 00:00:00, se for final, usar 23:59:59
        if (isStartDate) {
          date.setHours(0, 0, 0, 0);
        } else {
          date.setHours(23, 59, 59, 999);
        }

        // Converter para ISO string (formato: YYYY-MM-DDTHH:mm:ss)
        return date.toISOString();
      }

      // Se já estiver no formato ISO, retornar como está
      if (dateString.includes('T')) {
        return dateString;
      }

      // Tentar parsear como Date ISO
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        if (isStartDate) {
          date.setHours(0, 0, 0, 0);
        } else {
          date.setHours(23, 59, 59, 999);
        }
        return date.toISOString();
      }

      console.warn('Formato de data não reconhecido:', dateString);
      return null;
    } catch (error) {
      console.error('Erro ao converter data:', error);
      return null;
    }
  },

  async getMovementsByItem(itemId: string): Promise<StockMovement[]> {
    try {
      const response = await api.get(`/api/stock/movements/item/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar movimentações do item:', error);
      throw new Error('Falha ao buscar movimentações do item');
    }
  },

  async getDeliveryHistoryByEmployee(employeeId: string): Promise<StockMovement[]> {
    try {
      const response = await api.get(`/api/stock/movements/employee/${employeeId}/deliveries`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar histórico de entregas:', error);
      throw new Error('Falha ao buscar histórico de entregas');
    }
  },

  async getRecentMovements(limit = 10): Promise<StockMovement[]> {
    try {
      const response = await api.get(`/api/stock/movements/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar movimentações recentes:', error);
      throw new Error('Falha ao buscar movimentações recentes');
    }
  },

  // ===== ALERTAS =====

  async getActiveAlerts(): Promise<StockAlert[]> {
    try {
      const response = await api.get('/api/stock/alerts');
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar alertas ativos:', error);
      // Return empty array instead of throwing error to prevent component crash
      return [];
    }
  },

  async getUnreadAlerts(): Promise<StockAlert[]> {
    try {
      const response = await api.get('/api/stock/alerts/unread');
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar alertas não lidos:', error);
      return [];
    }
  },

  async markAlertAsRead(alertId: string): Promise<void> {
    try {
      await api.patch(`/api/stock/alerts/${alertId}/read`);
    } catch (error) {
      console.error('Erro ao marcar alerta como lido:', error);
      throw new Error('Falha ao marcar alerta como lido');
    }
  },

  async resolveAlert(alertId: string): Promise<void> {
    try {
      await api.patch(`/api/stock/alerts/${alertId}/resolve`);
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
      throw new Error('Falha ao resolver alerta');
    }
  },

  // ===== RELATÓRIOS =====

  async getStockReport(): Promise<StockReport> {
    try {
      const response = await api.get('/api/stock/report');
      return normalizeStockReportPayload(response.data as Record<string, unknown>);
    } catch (error) {
      console.error('Erro ao gerar relatório de estoque:', error);
      throw new Error('Falha ao gerar relatório');
    }
  },

  async getItemReport(itemId: string): Promise<any> {
    try {
      const response = await api.get(`/api/stock/reports/item/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar relatório do item:', error);
      throw new Error('Falha ao gerar relatório do item');
    }
  },

  async getMovementsReport(params: {
    startDate?: string;
    endDate?: string;
    itemId?: string;
    employeeId?: string;
    movementType?: MovementType;
  }): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.itemId) queryParams.append('itemId', params.itemId);
      if (params.employeeId) queryParams.append('employeeId', params.employeeId);
      if (params.movementType) queryParams.append('movementType', params.movementType);

      const response = await api.get(`/api/stock/reports/movements?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar relatório de movimentações:', error);
      throw new Error('Falha ao gerar relatório de movimentações');
    }
  },

  async getLowStockReport(): Promise<any> {
    try {
      const response = await api.get('/api/stock/reports/low-stock');
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar relatório de estoque baixo:', error);
      throw new Error('Falha ao gerar relatório de estoque baixo');
    }
  },

  async getDateRangeReport(startDate: string, endDate: string): Promise<any> {
    try {
      const response = await api.get(`/api/stock/reports/date-range?startDate=${startDate}&endDate=${endDate}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar relatório por período:', error);
      throw new Error('Falha ao gerar relatório por período');
    }
  },

  // ===== ENUMS =====

  async getCategories(): Promise<StockCategory[]> {
    try {
      const response = await api.get('/api/stock/enums/categories');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return Object.values(StockCategory);
    }
  },

  async getMovementTypes(): Promise<MovementType[]> {
    try {
      const response = await api.get('/api/stock/enums/movement-types');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar tipos de movimentação:', error);
      return Object.values(MovementType);
    }
  },

  async getMovementReasons(): Promise<MovementReason[]> {
    try {
      const response = await api.get('/api/stock/enums/movement-reasons');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar motivos de movimentação:', error);
      return Object.values(MovementReason);
    }
  },

  // ===== DOWNLOAD DE RELATÓRIOS PDF =====

  async downloadLowStockPDF(companyId: string): Promise<void> {
    try {
      const response = await api.get(`/api/stock/reports/low-stock/pdf?companyId=${companyId}`, {
        responseType: 'blob'
      });
      this.handleFileDownload(response.data, 'estoque-baixo.pdf');
    } catch (error) {
      console.error('Erro ao baixar PDF de estoque baixo:', error);
      throw new Error('Falha ao baixar relatório');
    }
  },

  async downloadGeneralStockPDF(companyId: string, category?: StockCategory): Promise<void> {
    try {
      let url = `/api/stock/reports/general/pdf?companyId=${companyId}`;
      if (category) url += `&category=${category}`;

      const response = await api.get(url, {
        responseType: 'blob'
      });
      this.handleFileDownload(response.data, 'estoque-geral.pdf');
    } catch (error) {
      console.error('Erro ao baixar PDF geral de estoque:', error);
      throw new Error('Falha ao baixar relatório');
    }
  },

  async downloadMovementsPDF(companyId: string, startDate: string, endDate: string): Promise<void> {
    try {
      const isoStart = this.convertDateToISO(startDate, true);
      const isoEnd = this.convertDateToISO(endDate, false);

      const response = await api.get(`/api/stock/reports/movements/pdf?companyId=${companyId}&start=${isoStart}&end=${isoEnd}`, {
        responseType: 'blob'
      });
      this.handleFileDownload(response.data, 'movimentacoes-estoque.pdf');
    } catch (error) {
      console.error('Erro ao baixar PDF de movimentações:', error);
      throw new Error('Falha ao baixar relatório');
    }
  },

  async downloadConsolidatedStockPDF(companyId: string, startDate: string, endDate: string): Promise<void> {
    try {
      const isoStart = this.convertDateToISO(startDate, true);
      const isoEnd = this.convertDateToISO(endDate, false);
      if (!isoStart || !isoEnd) {
        throw new Error('Período inválido');
      }
      const params = new URLSearchParams({
        companyId,
        start: isoStart,
        end: isoEnd
      });
      const response = await api.get(`/api/stock/reports/consolidated/pdf?${params.toString()}`, {
        responseType: 'blob'
      });
      this.handleFileDownload(response.data, 'relatorio-estoque-consolidado.pdf');
    } catch (error) {
      console.error('Erro ao baixar PDF consolidado de estoque:', error);
      throw new Error('Falha ao baixar relatório consolidado');
    }
  },

  async downloadPhysicalInventoryPDF(companyId: string): Promise<void> {
    try {
      const response = await api.get(`/api/stock/reports/physical-inventory/pdf?companyId=${companyId}`, {
        responseType: 'blob'
      });
      this.handleFileDownload(response.data, 'planilha-conferencia-estoque.pdf');
    } catch (error) {
      console.error('Erro ao baixar PDF de conferência física:', error);
      throw new Error('Falha ao baixar planilha de conferência');
    }
  },

  async downloadConsolidatedRequisitionsPDF(companyId: string, startDate: string, endDate: string): Promise<void> {
    try {
      const isoStart = this.convertDateToISO(startDate, true);
      const isoEnd = this.convertDateToISO(endDate, false);
      if (!isoStart || !isoEnd) {
        throw new Error('Período inválido');
      }
      const params = new URLSearchParams({
        companyId,
        start: isoStart,
        end: isoEnd
      });
      const response = await api.get(`/api/stock/reports/consolidated-requisitions/pdf?${params.toString()}`, {
        responseType: 'blob'
      });
      this.handleFileDownload(response.data, 'requisicoes-consolidadas.pdf');
    } catch (error) {
      console.error('Erro ao baixar PDF de requisições consolidadas:', error);
      throw new Error('Falha ao baixar relatório de requisições');
    }
  },

  async getStockDashboard(companyId: string, start?: string, end?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('companyId', companyId);
      if (start) params.append('start', start);
      if (end) params.append('end', end);

      const response = await api.get(`/api/stock/dashboard?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dashboard de estoque:', error);
      throw new Error('Falha ao buscar dados do dashboard');
    }
  },

  async getLocationStockSummary(): Promise<LocationStockSummaryRow[]> {
    try {
      const response = await api.get<LocationStockSummaryRow[]>('/api/stock/reports/location-summary');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Erro ao buscar resumo por localização:', error);
      return [];
    }
  },

  // ===== PRATELEIRAS =====

  async getAllShelves(): Promise<StorageShelf[]> {
    try {
      const response = await api.get('/api/stock/shelves');
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar prateleiras:', error);
      return [];
    }
  },

  async createShelf(shelfData: Partial<StorageShelf>): Promise<StorageShelf> {
    try {
      const response = await api.post('/api/stock/shelves', shelfData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar prateleira:', error);
      throw new Error('Falha ao criar prateleira');
    }
  },

  async updateShelf(id: string, shelfData: Partial<StorageShelf>): Promise<StorageShelf> {
    try {
      const response = await api.put(`/api/stock/shelves/${id}`, shelfData);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar prateleira:', error);
      throw new Error('Falha ao atualizar prateleira');
    }
  },

  async deleteShelf(id: string): Promise<void> {
    try {
      await api.delete(`/api/stock/shelves/${id}`);
    } catch (error) {
      console.error('Erro ao excluir prateleira:', error);
      throw new Error('Falha ao excluir prateleira');
    }
  },

  // ===== ASSINATURAS E REQUISIÇÕES =====

  async signMovement(movementId: string, signatureBase64: string): Promise<StockMovement> {
    try {
      const response = await api.post(`/api/stock/movements/${movementId}/sign`, {
        signature: signatureBase64
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao assinar movimentação:', error);
      throw new Error('Falha ao registrar assinatura');
    }
  },

  async downloadRequisitionPDF(movementId: string): Promise<void> {
    try {
      const response = await api.get(`/api/stock/movements/${movementId}/requisition`, {
        responseType: 'blob'
      });
      this.handleFileDownload(response.data, `requisicao_${movementId.substring(0, 8)}.pdf`);
    } catch (error) {
      console.error('Erro ao baixar PDF da requisição:', error);
      throw new Error('Falha ao baixar PDF');
    }
  },

  async listStockRequisitions(): Promise<StockRequisitionListItem[]> {
    const response = await api.get('/api/stock/requisitions');
    return Array.isArray(response.data) ? response.data : [];
  },

  async createStockRequisition(payload: CreateStockRequisitionPayload): Promise<StockRequisitionDTO> {
    const response = await api.post('/api/stock/requisitions', payload);
    return response.data;
  },

  async updateStockRequisition(id: string, payload: CreateStockRequisitionPayload): Promise<StockRequisitionDTO> {
    const response = await api.put(`/api/stock/requisitions/${id}`, payload);
    return response.data;
  },

  async deleteStockRequisition(id: string): Promise<void> {
    await api.delete(`/api/stock/requisitions/${id}`);
  },

  async deleteStockRequisitionsBulk(ids: string[]): Promise<void> {
    const unique = [...new Set(ids.map((x) => String(x).trim()).filter(Boolean))];
    if (unique.length === 0) return;
    await api.delete('/api/stock/requisitions/bulk-delete', { data: unique });
  },

  async getStockRequisition(id: string): Promise<StockRequisitionDTO> {
    const response = await api.get(`/api/stock/requisitions/${id}`);
    return response.data;
  },

  async approveStockRequisition(id: string): Promise<StockRequisitionDTO> {
    const response = await api.post(`/api/stock/requisitions/${id}/approve`);
    return response.data;
  },

  async deliverStockRequisition(id: string, payload: DeliverStockRequisitionPayload): Promise<StockRequisitionDTO> {
    const response = await api.post(`/api/stock/requisitions/${id}/deliver`, payload);
    return response.data;
  },

  async downloadStockRequisitionPdf(id: string, requisitionNumber?: string): Promise<void> {
    const response = await api.get(`/api/stock/requisitions/${id}/pdf`, { responseType: 'blob' });
    const name = requisitionNumber
      ? `requisicao_${requisitionNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`
      : `requisicao_estoque_${id.substring(0, 8)}.pdf`;
    this.handleFileDownload(response.data, name);
  },

  async sendRequisition(movementId: string, type: RequisitionSentType, destination?: string): Promise<void> {
    try {
      const params = new URLSearchParams();
      params.append('type', type);
      if (destination) params.append('destination', destination);

      await api.post(`/api/stock/movements/${movementId}/send?${params.toString()}`);
    } catch (error) {
      console.error('Erro ao enviar requisição:', error);
      throw new Error('Falha ao enviar requisição');
    }
  },

  handleFileDownload(data: Blob, filename: string): void {
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};
