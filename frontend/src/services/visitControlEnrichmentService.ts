import api from '@/lib/axios';

/* -------------------------------------------------------------------------- */
/* Enums (espelham backend)                                                    */
/* -------------------------------------------------------------------------- */
export type VisitPhotoType =
  | 'GENERAL'
  | 'POST'
  | 'EQUIPMENT'
  | 'EPI'
  | 'INCIDENT'
  | 'REPORT_SHEET';

export type VisitIssueCategory = 'SAFETY' | 'INFRA' | 'EQUIPMENT' | 'BEHAVIOR' | 'OTHER';
export type VisitIssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type VisitAssetType = 'EQUIPMENT' | 'VEHICLE' | 'OTHER';
export type VisitAssetStatus = 'PRESENT' | 'MISSING' | 'DAMAGED' | 'NEEDS_MAINTENANCE';

/* -------------------------------------------------------------------------- */
/* DTOs                                                                       */
/* -------------------------------------------------------------------------- */
export interface VisitPhoto {
  id: string;
  fileUrl: string;
  photoType: VisitPhotoType;
  caption?: string;
  takenAt: string;
  uploadedBy?: string;
}

export interface VisitIssue {
  id: string;
  category: VisitIssueCategory;
  severity: VisitIssueSeverity;
  description: string;
  reportedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface VisitIssueCreate {
  category: VisitIssueCategory;
  severity: VisitIssueSeverity;
  description: string;
}

export interface VisitPostAsset {
  id: string;
  assetType: VisitAssetType;
  referenceId?: string;
  description: string;
  status: VisitAssetStatus;
  notes?: string;
}

export interface VisitPostAssetCreate {
  assetType: VisitAssetType;
  referenceId?: string;
  description: string;
  status?: VisitAssetStatus;
  notes?: string;
}

export interface VisitEpiDelivery {
  id: string;
  employeeId?: string;
  employeeName?: string;
  epiItemDescription: string;
  quantity: number;
  photoUrl?: string;
  employeeConfirmed: boolean;
  deliveredAt: string;
  notes?: string;
}

export interface VisitEpiDeliveryCreate {
  employeeId?: string;
  epiItemDescription: string;
  quantity?: number;
  employeeConfirmed?: boolean;
  notes?: string;
}

export interface VisitFull {
  visitControlId: string;
  photos: VisitPhoto[];
  issues: VisitIssue[];
  postAssets: VisitPostAsset[];
  epiDeliveries: VisitEpiDelivery[];
}

/* -------------------------------------------------------------------------- */
/* Service                                                                    */
/* -------------------------------------------------------------------------- */
const base = (visitId: string) => `/api/visit-controls/${visitId}`;

export const visitControlEnrichmentService = {
  /** Bundle full: tudo de uma visita em uma chamada. */
  async getFull(visitId: string): Promise<VisitFull> {
    const { data } = await api.get<VisitFull>(`${base(visitId)}/full`);
    return data;
  },

  /* ---- Fotos ---- */
  async addPhoto(
    visitId: string,
    file: File,
    options: { photoType?: VisitPhotoType; caption?: string; uploadedBy?: string } = {},
  ): Promise<VisitPhoto> {
    const form = new FormData();
    form.append('file', file);
    if (options.photoType) form.append('photoType', options.photoType);
    if (options.caption) form.append('caption', options.caption);
    if (options.uploadedBy) form.append('uploadedBy', options.uploadedBy);
    const { data } = await api.post<VisitPhoto>(`${base(visitId)}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async listPhotos(visitId: string): Promise<VisitPhoto[]> {
    const { data } = await api.get<VisitPhoto[]>(`${base(visitId)}/photos`);
    return data;
  },

  async deletePhoto(visitId: string, photoId: string): Promise<void> {
    await api.delete(`${base(visitId)}/photos/${photoId}`);
  },

  /* ---- Problemas reportados ---- */
  async addIssue(visitId: string, payload: VisitIssueCreate): Promise<VisitIssue> {
    const { data } = await api.post<VisitIssue>(`${base(visitId)}/issues`, payload);
    return data;
  },

  async listIssues(visitId: string): Promise<VisitIssue[]> {
    const { data } = await api.get<VisitIssue[]>(`${base(visitId)}/issues`);
    return data;
  },

  /** Marca como resolvido (apenas Gestor Operacional). */
  async resolveIssue(
    visitId: string,
    issueId: string,
    resolutionNotes?: string,
  ): Promise<VisitIssue> {
    const { data } = await api.patch<VisitIssue>(
      `${base(visitId)}/issues/${issueId}/resolve`,
      { resolutionNotes },
    );
    return data;
  },

  /* ---- Inventário rápido (equipamentos/veículos no posto) ---- */
  async addPostAsset(visitId: string, payload: VisitPostAssetCreate): Promise<VisitPostAsset> {
    const { data } = await api.post<VisitPostAsset>(`${base(visitId)}/post-assets`, payload);
    return data;
  },

  async listPostAssets(visitId: string): Promise<VisitPostAsset[]> {
    const { data } = await api.get<VisitPostAsset[]>(`${base(visitId)}/post-assets`);
    return data;
  },

  /* ---- Entrega de EPI ---- */
  async addEpiDelivery(
    visitId: string,
    payload: VisitEpiDeliveryCreate,
    photo?: File,
  ): Promise<VisitEpiDelivery> {
    const form = new FormData();
    form.append('data', JSON.stringify(payload));
    if (photo) form.append('photo', photo);
    const { data } = await api.post<VisitEpiDelivery>(`${base(visitId)}/epi-deliveries`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async listEpiDeliveries(visitId: string): Promise<VisitEpiDelivery[]> {
    const { data } = await api.get<VisitEpiDelivery[]>(`${base(visitId)}/epi-deliveries`);
    return data;
  },
};

export default visitControlEnrichmentService;
