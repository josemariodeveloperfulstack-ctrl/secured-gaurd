export enum EquipmentStatus {
  EM_USO = 'EM_USO',
  EM_MANUTENCAO = 'EM_MANUTENCAO',
  AGUARDANDO_DESCARTE = 'AGUARDANDO_DESCARTE',
  EM_ESTOQUE = 'EM_ESTOQUE',
  BAIXADO = 'BAIXADO'
}

export enum ProtectionLevel {
  IIA = 'IIA',
  II = 'II',
  IIIA = 'IIIA',
  III = 'III',
  IV = 'IV'
}

export enum EquipmentUsage {
  USO_DIARIO = 'USO_DIARIO',
  USO_EVENTUAL = 'USO_EVENTUAL',
  RESERVADO = 'RESERVADO'
}

export enum EquipmentSize {
  P = 'P',
  M = 'M',
  G = 'G',
  GG = 'GG',
  UNICO = 'UNICO'
}

export enum EquipmentType {
  ARMA = 'ARMA',
  COLETE = 'COLETE',
  MUNICAO = 'MUNICAO'
}

export interface Equipment {
  id: string;
  status: EquipmentStatus;
  ballisticPlate?: string;
  manufacturingDate: string;
  sixYearExpiry?: string;
  weaponRegistrationValidity?: string;
  usageType?: EquipmentUsage;
  serialNumber: string;
  caNumber?: string;
  protectionLevel?: ProtectionLevel;
  batch?: string;
  model?: string;
  size?: EquipmentSize;
  validityDate?: string;
  isDangerous: boolean;
  notes?: string;
  qrCode?: string;
  currentUserId?: string;
  currentUserName?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  sourceWorkPostId?: string;
  destinationWorkPostId?: string;
  createdAt: string;
  updatedAt: string;
  
  // Novos campos para controle de tipo e postos
  type?: EquipmentType;
  shotsQuantity?: number;
  weaponRegistration?: string;
  quantity?: number;
  caliber?: string;
  workPostId?: string;
  workPostName?: string;
  
  // Campos calculados
  isExpired: boolean;
  isExpiringSoon: boolean;
  isWeaponRegistrationExpired: boolean;
  isWeaponRegistrationExpiringSoon: boolean;
  daysToExpiry?: number;
  daysToWeaponRegistrationExpiry?: number;
}

export interface CreateEquipmentRequest {
  status: EquipmentStatus;
  ballisticPlate?: string;
  manufacturingDate: string;
  weaponRegistrationValidity?: string;
  usageType?: EquipmentUsage;
  serialNumber: string;
  caNumber?: string;
  protectionLevel?: ProtectionLevel;
  batch?: string;
  model?: string;
  size?: EquipmentSize;
  validityDate?: string;
  isDangerous?: boolean;
  notes?: string;
  currentUserId?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  sourceWorkPostId?: string;
  destinationWorkPostId?: string;
  
  // Novos campos para controle de tipo
  type?: EquipmentType;
  shotsQuantity?: number;
  weaponRegistration?: string;
  quantity?: number;
  caliber?: string;
  workPostId?: string;
}

export interface EquipmentFilters {
  searchTerm?: string;
  status?: EquipmentStatus;
  usageType?: EquipmentUsage;
  protectionLevel?: ProtectionLevel;
  size?: EquipmentSize;
  isDangerous?: boolean;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  isWeaponRegistrationExpired?: boolean;
  isWeaponRegistrationExpiringSoon?: boolean;
  currentUserId?: string;
  batch?: string;
  model?: string;
  validityDateFrom?: string;
  validityDateTo?: string;
  manufacturingDateFrom?: string;
  manufacturingDateTo?: string;
  weaponRegistrationValidityFrom?: string;
  weaponRegistrationValidityTo?: string;
  
  // Novos campos
  type?: EquipmentType;
  workPostId?: string;
}

export interface EquipmentSummary {
  totalEquipments: number;
  activeEquipments: number;
  inMaintenanceEquipments: number;
  inStockEquipments: number;
  expiredEquipments: number;
  expiringSoon30Days: number;
  expiringSoon60Days: number;
  weaponRegistrationExpired: number;
  weaponRegistrationExpiringSoon30Days: number;
  weaponRegistrationExpiringSoon60Days: number;
  dangerousEquipments: number;
  equipmentsWithUsers: number;
  
  // Novos contadores de estoque no cofre
  weaponsInSafe?: number;
  vestsInSafe?: number;
  ammoInSafe?: number;
}

export const EQUIPMENT_STATUS_LABELS = {
  [EquipmentStatus.EM_USO]: 'Em uso',
  [EquipmentStatus.EM_MANUTENCAO]: 'Em manutenção',
  [EquipmentStatus.AGUARDANDO_DESCARTE]: 'Aguardando descarte',
  [EquipmentStatus.EM_ESTOQUE]: 'Em estoque',
  [EquipmentStatus.BAIXADO]: 'Baixado'
};

export const PROTECTION_LEVEL_LABELS = {
  [ProtectionLevel.IIA]: 'IIA',
  [ProtectionLevel.II]: 'II',
  [ProtectionLevel.IIIA]: 'IIIA',
  [ProtectionLevel.III]: 'III',
  [ProtectionLevel.IV]: 'IV'
};

export const EQUIPMENT_USAGE_LABELS = {
  [EquipmentUsage.USO_DIARIO]: 'Uso diário',
  [EquipmentUsage.USO_EVENTUAL]: 'Uso eventual',
  [EquipmentUsage.RESERVADO]: 'Reservado'
};

export const EQUIPMENT_SIZE_LABELS = {
  [EquipmentSize.P]: 'P',
  [EquipmentSize.M]: 'M',
  [EquipmentSize.G]: 'G',
  [EquipmentSize.GG]: 'GG',
  [EquipmentSize.UNICO]: 'Único'
};

export const EQUIPMENT_TYPE_LABELS = {
  [EquipmentType.ARMA]: 'Arma',
  [EquipmentType.COLETE]: 'Colete',
  [EquipmentType.MUNICAO]: 'Munição'
};