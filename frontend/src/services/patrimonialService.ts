import api from '@/lib/axios';

const BASE = '/api/patrimonial';

// --- Categories ---
export interface PatrimonialCategory {
  id: string;
  name: string;
  description?: string;
  defaultUsefulLifeYears?: number;
  defaultDepreciationRatePct?: number;
}

export interface PatrimonialCategoryCreate {
  name: string;
  description?: string;
  defaultUsefulLifeYears?: number;
  defaultDepreciationRatePct?: number;
}

export interface PatrimonialCategoryUpdate extends Partial<PatrimonialCategoryCreate> {}

// --- Locations ---
export interface PatrimonialLocation {
  id: string;
  code?: string;
  name: string;
  addressOrRoom?: string;
  notes?: string;
}

export interface PatrimonialLocationCreate {
  code?: string;
  name: string;
  addressOrRoom?: string;
  notes?: string;
}

export interface PatrimonialLocationUpdate extends Partial<PatrimonialLocationCreate> {}

// --- Assets (backend may return entity with category/location objects) ---
export interface PatrimonialAsset {
  id: string;
  code: string;
  name: string;
  description?: string;
  categoryId?: string;
  category?: { id: string; name: string };
  locationId?: string;
  location?: { id: string; code?: string; name: string } | null;
  acquisitionDate: string;
  acquisitionValue: number;
  usefulLifeYears: number;
  residualValuePct?: number;
  status: string;
  serialNumber?: string;
  invoiceNumber?: string;
  responsibleEmployeeId?: string | null;
  responsibleEmployee?: { id: string; name?: string } | null;
  notes?: string;
}

export interface PatrimonialAssetCreate {
  name: string;
  description?: string;
  categoryId: string;
  locationId?: string | null;
  acquisitionDate: string;
  acquisitionValue: number;
  usefulLifeYears: number;
  residualValuePct?: number;
  status?: string;
  serialNumber?: string;
  invoiceNumber?: string;
  responsibleEmployeeId?: string | null;
  notes?: string;
}

export interface PatrimonialAssetUpdate extends Partial<PatrimonialAssetCreate> {}

export interface PatrimonialAssetFilters {
  codeOrName?: string;
  categoryId?: string;
  locationId?: string;
  status?: string;
  acquisitionDateFrom?: string;
  acquisitionDateTo?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface PatrimonialDepreciation {
  asOfDate: string;
  acquisitionValue: number;
  accumulatedDepreciation: number;
  bookValue: number;
  monthsDepreciated: number;
  usefulLifeMonths: number;
}

export interface PatrimonialAssetPage {
  content: PatrimonialAsset[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// --- API ---
export const patrimonialService = {
  // Categories
  async listCategories(): Promise<PatrimonialCategory[]> {
    const { data } = await api.get<PatrimonialCategory[]>(`${BASE}/categories`);
    return Array.isArray(data) ? data : [];
  },
  async getCategoryById(id: string): Promise<PatrimonialCategory> {
    const { data } = await api.get<PatrimonialCategory>(`${BASE}/categories/${id}`);
    return data;
  },
  async createCategory(payload: PatrimonialCategoryCreate): Promise<PatrimonialCategory> {
    const { data } = await api.post<PatrimonialCategory>(`${BASE}/categories`, payload);
    return data;
  },
  async updateCategory(id: string, payload: PatrimonialCategoryUpdate): Promise<PatrimonialCategory> {
    const { data } = await api.put<PatrimonialCategory>(`${BASE}/categories/${id}`, payload);
    return data;
  },
  async deleteCategory(id: string): Promise<void> {
    await api.delete(`${BASE}/categories/${id}`);
  },

  // Locations
  async listLocations(): Promise<PatrimonialLocation[]> {
    const { data } = await api.get<PatrimonialLocation[]>(`${BASE}/locations`);
    return Array.isArray(data) ? data : [];
  },
  async getLocationById(id: string): Promise<PatrimonialLocation> {
    const { data } = await api.get<PatrimonialLocation>(`${BASE}/locations/${id}`);
    return data;
  },
  async createLocation(payload: PatrimonialLocationCreate): Promise<PatrimonialLocation> {
    const { data } = await api.post<PatrimonialLocation>(`${BASE}/locations`, payload);
    return data;
  },
  async updateLocation(id: string, payload: PatrimonialLocationUpdate): Promise<PatrimonialLocation> {
    const { data } = await api.put<PatrimonialLocation>(`${BASE}/locations/${id}`, payload);
    return data;
  },
  async deleteLocation(id: string): Promise<void> {
    await api.delete(`${BASE}/locations/${id}`);
  },

  // Assets
  async listAssets(filters: PatrimonialAssetFilters = {}): Promise<PatrimonialAssetPage> {
    const params = new URLSearchParams();
    if (filters.codeOrName != null && filters.codeOrName !== '') params.append('codeOrName', filters.codeOrName);
    if (filters.categoryId != null && filters.categoryId !== '') params.append('categoryId', filters.categoryId);
    if (filters.locationId != null && filters.locationId !== '') params.append('locationId', filters.locationId);
    if (filters.status != null && filters.status !== '') params.append('status', filters.status);
    if (filters.acquisitionDateFrom != null) params.append('acquisitionDateFrom', filters.acquisitionDateFrom);
    if (filters.acquisitionDateTo != null) params.append('acquisitionDateTo', filters.acquisitionDateTo);
    params.append('page', String(filters.page ?? 0));
    params.append('size', String(filters.size ?? 10));
    if (filters.sort != null) params.append('sort', filters.sort);
    const { data } = await api.get<PatrimonialAssetPage>(`${BASE}/assets`, { params });
    return {
      content: data.content ?? [],
      totalElements: data.totalElements ?? 0,
      totalPages: data.totalPages ?? 0,
      size: data.size ?? 10,
      number: data.number ?? 0,
    };
  },
  async getAssetById(id: string): Promise<PatrimonialAsset> {
    const { data } = await api.get<PatrimonialAsset>(`${BASE}/assets/${id}`);
    return data;
  },
  async getDepreciation(id: string, asOf?: string): Promise<PatrimonialDepreciation> {
    const params = asOf ? { asOf } : {};
    const { data } = await api.get<PatrimonialDepreciation>(`${BASE}/assets/${id}/depreciation`, { params });
    return data;
  },
  async createAsset(payload: PatrimonialAssetCreate): Promise<PatrimonialAsset> {
    const { data } = await api.post<PatrimonialAsset>(`${BASE}/assets`, payload);
    return data;
  },
  async updateAsset(id: string, payload: PatrimonialAssetUpdate): Promise<PatrimonialAsset> {
    const { data } = await api.put<PatrimonialAsset>(`${BASE}/assets/${id}`, payload);
    return data;
  },
  async deleteAsset(id: string): Promise<void> {
    await api.delete(`${BASE}/assets/${id}`);
  },
};
