export interface StockItem {
  id: string;
  code: string;
  name: string;
  category: StockCategory;
  sizeVariation?: string;
  description?: string;
  currentQuantity: number;
  minimumQuantity: number;
  unitCost?: number;
  /** Valor unitário do último cadastro (antes da atualização atual). */
  previousUnitCost?: number;
  supplier?: string;
  barcode?: string;
  qrCode?: string;
  active: boolean;
  unitId?: string;
  unitName?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  isLowStock: boolean;
  fullName: string;
  locations?: StockItemLocation[];
}

export interface StockItemLocation {
  id: string;
  shelfId: string;
  shelfIdentification: string;
  floor: string;
  quantity: number;
}

export interface StorageShelf {
  id: string;
  identification: string;
  block?: string;
  section?: string;
  aisle?: string;
  room?: string;
  compartmentInfo?: string;
  active: boolean;
}

export interface StockMovement {
  id: string;
  stockItemId: string;
  stockItemName: string;
  stockItemCode: string;
  stockItemFullName: string;
  movementType: MovementType;
  reason: MovementReason;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  employeeId?: string;
  employeeName?: string;
  userId?: string;
  userName?: string;
  documentNumber?: string;
  supplier?: string;
  unitCost?: number;
  totalCost?: number;
  movementDate: string;
  notes?: string;
  qrCodeUsed?: string;
  unitId?: string;
  unitName?: string;
  // Novos campos
  digitalSignature?: string;
  signatureDate?: string;
  signatureType?: SignatureType;
  requisitionUrl?: string;
  requisitionSentType?: RequisitionSentType;
  itemLocationId?: string;
  /** Mesmo número em todas as linhas de um import de inventário (REQ-INV-...) */
  requisitionNumber?: string;
}

export interface PhysicalInventoryImportLineResult {
  categoryLabel: string;
  itemName?: string;
  stockItemCode?: string;
  previousQuantity?: number;
  targetQuantity?: number;
  delta?: number;
  movementId?: string;
  skipped: boolean;
  message?: string;
}

export interface PhysicalInventoryImportResult {
  /** SUMMARY = aba resumo por categoria; DETAIL = linhas por item (inventário no cadastro). */
  importMode?: string;
  requisitionNumber: string;
  importedAt: string;
  fileName: string;
  lines: PhysicalInventoryImportLineResult[];
  warnings: string[];
}

export interface InventoryRequisitionSummary {
  requisitionNumber: string;
  firstMovementAt: string;
  movementCount: number;
}

export enum SignatureType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL'
}

export enum RequisitionSentType {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  NONE = 'NONE'
}

export interface StockAlert {
  id: string;
  stockItemId: string;
  stockItemName: string;
  stockItemCode: string;
  alertType: string;
  message: string;
  currentQuantity?: number;
  minimumQuantity?: number;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  resolvedByUserName?: string;
  priority: number;
}

export enum StockCategory {
  UNIFORME_VIGILANCIA = 'UNIFORME_VIGILANCIA',
  UNIFORME_SERVICOS = 'UNIFORME_SERVICOS',
  UNIFORME_ADMINISTRATIVO = 'UNIFORME_ADMINISTRATIVO',
  UNIFORME_COZINHA = 'UNIFORME_COZINHA',
  EPI = 'EPI',
  ACESSORIOS = 'ACESSORIOS',
  CALCADOS = 'CALCADOS'
}

export enum MovementType {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA'
}

export enum MovementReason {
  // Entradas
  COMPRA = 'COMPRA',
  DEVOLUCAO = 'DEVOLUCAO',
  AJUSTE_ENTRADA = 'AJUSTE_ENTRADA',
  
  // Saídas
  ENTREGA_INICIAL = 'ENTREGA_INICIAL',
  REPOSICAO = 'REPOSICAO',
  TROCA = 'TROCA',
  DESCARTE = 'DESCARTE',
  PERDA = 'PERDA',
  AJUSTE_SAIDA = 'AJUSTE_SAIDA'
}

export interface CreateStockItemDTO {
  code: string;
  name: string;
  category: StockCategory;
  sizeVariation?: string;
  description?: string;
  currentQuantity?: number;
  minimumQuantity?: number;
  unitCost?: number;
  supplier?: string;
  barcode?: string;
  unitId?: string;
  notes?: string;
  initialShelfId?: string;
  initialFloor?: string;
}

export interface CreateStockMovementDTO {
  stockItemId: string;
  movementType: MovementType;
  reason: MovementReason;
  quantity: number;
  employeeId?: string;
  documentNumber?: string;
  supplier?: string;
  unitCost?: number;
  notes?: string;
  qrCodeUsed?: string;
  unitId?: string;
  shelfId?: string;
  floor?: string;
  requisitionNumber?: string;
}

export enum StockRequisitionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export const StockRequisitionStatusLabels: Record<StockRequisitionStatus, string> = {
  [StockRequisitionStatus.PENDING]: 'Pendente',
  [StockRequisitionStatus.APPROVED]: 'Aprovada',
  [StockRequisitionStatus.DELIVERED]: 'Entregue',
  [StockRequisitionStatus.CANCELLED]: 'Cancelada'
};

/** Resumo agregado por prateleira/andar (GET /api/stock/reports/location-summary) */
export interface LocationStockSummaryRow {
  shelfIdentification?: string;
  floor?: string | null;
  totalQuantity?: number;
}

export interface StockRequisitionLineDTO {
  id?: string;
  stockItemId: string;
  stockItemCode?: string;
  stockItemName?: string;
  stockItemFullName?: string;
  quantity: number;
}

export interface StockRequisitionDTO {
  id: string;
  requisitionNumber: string;
  employeeId: string;
  employeeName?: string;
  employeeDocument?: string;
  /** Snapshot na criação: setor, posto, cargo */
  employeeWorkSector?: string;
  requestedByUserId?: string;
  requestedByName?: string;
  movementReason: MovementReason;
  movementReasonLabel?: string;
  notes?: string;
  status: StockRequisitionStatus;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  deliveredAt?: string;
  deliveredByUserId?: string;
  deliveredByName?: string;
  signatureType?: SignatureType;
  signatureAt?: string;
  physicalSignatureAck?: string;
  hasDigitalSignature?: boolean;
  createdAt?: string;
  lines: StockRequisitionLineDTO[];
}

export interface CreateStockRequisitionPayload {
  employeeId: string;
  movementReason: MovementReason;
  notes?: string;
  lines: { stockItemId: string; quantity: number }[];
}

export interface DeliverStockRequisitionPayload {
  signatureType: SignatureType;
  digitalSignature?: string;
  physicalAcknowledgment?: string;
}

/** Linha da listagem em Estoque / APIs de consulta */
export interface StockRequisitionListItem {
  id: string;
  requisitionNumber: string;
  status: StockRequisitionStatus;
  employeeName?: string;
  movementReasonLabel?: string;
  createdAt?: string;
  requestedByName?: string;
  linesCount: number;
}

export interface StockFilters {
  category?: StockCategory;
  active?: boolean;
  unitId?: string;
  lowStock?: boolean;
  searchTerm?: string;
}

export interface MovementFilters {
  stockItemId?: string;
  employeeId?: string;
  movementType?: MovementType;
  reason?: MovementReason;
  unitId?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  requisitionNumber?: string;
}

export interface StockReport {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
  /** Soma de quantidades atuais (unidades físicas em estoque) */
  totalQuantity?: number;
  itemsByCategory: Record<string, number>;
  activeAlerts: number;
  criticalAlerts: number;
  lowStockItems: StockItem[];
  outOfStockItems: StockItem[];
}

// Labels para exibição
export const StockCategoryLabels: Record<StockCategory, string> = {
  [StockCategory.UNIFORME_VIGILANCIA]: 'Uniforme Vigilância',
  [StockCategory.UNIFORME_SERVICOS]: 'Uniforme Serviços',
  [StockCategory.UNIFORME_ADMINISTRATIVO]: 'Uniforme Administrativo',
  [StockCategory.UNIFORME_COZINHA]: 'Uniforme Cozinha',
  [StockCategory.EPI]: 'EPI',
  [StockCategory.ACESSORIOS]: 'Acessórios',
  [StockCategory.CALCADOS]: 'Calçados'
};

export const MovementTypeLabels: Record<MovementType, string> = {
  [MovementType.ENTRADA]: 'Entrada',
  [MovementType.SAIDA]: 'Saída'
};

export const MovementReasonLabels: Record<MovementReason, string> = {
  [MovementReason.COMPRA]: 'Compra/Fornecimento',
  [MovementReason.DEVOLUCAO]: 'Devolução',
  [MovementReason.AJUSTE_ENTRADA]: 'Ajuste de Estoque - Entrada',
  [MovementReason.ENTREGA_INICIAL]: 'Entrega Inicial',
  [MovementReason.REPOSICAO]: 'Reposição',
  [MovementReason.TROCA]: 'Troca',
  [MovementReason.DESCARTE]: 'Descarte',
  [MovementReason.PERDA]: 'Perda',
  [MovementReason.AJUSTE_SAIDA]: 'Ajuste de Estoque - Saída'
};

export interface StockMovementChartDTO {
  label: string;
  entries: number;
  exits: number;
}

export interface StockDashboardDTO {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalQuantity: number;
  totalValue: number;
  generatedRequisitionsCount: number;
  consolidatedRequisitionsCount: number;
  movementsChart: StockMovementChartDTO[];
  stockStatusDistribution: Record<string, number>;
}