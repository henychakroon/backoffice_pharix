import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface ImportPreviewData {
  importToken: string;
  totalParsed: number;
  skipped: number;
  toInsert: number;
  toUpdate: number;
  toSkip: number;
  missingFromFile: number;
  missingAmms: string[];
  warnings: string[];
}

export interface MappingNeededData {
  token: string;
  foundColumns: string[];
  expectedColumns: string[];
  /** Best-guess mapping: expectedColName → foundColName (may be incomplete) */
  suggestedMapping: Record<string, string>;
}

export interface ImportStepResponse {
  step: 'PREVIEW_READY' | 'MAPPING_NEEDED';
  preview?: ImportPreviewData;
  mapping?: MappingNeededData;
}

export interface ImportConfirmData {
  importId: number;
  inserted: number;
  updated: number;
  skipped: number;
}

export interface MedicationDTO {
  id: number;
  amm: string;
  name: string;
  dci: string;
  dosage: string;
  forme: string;
  presentation: string;
  laboratoire: string;
  dateAmm: string;
  conditionnement: string;
  specification: string;
  tableau: string;
  dureeConservation: string;
  description: string;
  gpb: string;
  veic: string;
  referencePrice: number | null;
  isActive: boolean;
  lastImportId: number | null;
  subCategoryName: string;
  categoryName: string;
}

export interface MedicationPageDTO {
  content: MedicationDTO[];
  totalElements: number;
  totalPages: number;
  page: number;
}

export interface MedicationFilter {
  search?: string;
  classe?: string;
  sousClasse?: string;
  laboratoire?: string;
  veic?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
}

export interface MedicationUpdateRequest {
  name?: string;
  dci?: string;
  dosage?: string;
  forme?: string;
  presentation?: string;
  laboratoire?: string;
  dateAmm?: string;
  conditionnement?: string;
  specification?: string;
  tableau?: string;
  dureeConservation?: string;
  description?: string;
  gpb?: string;
  veic?: string;
  referencePrice?: number | null;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly BASE = '/api/catalog';

  constructor(private http: HttpClient) {}

  importCatalog(file: File): Observable<ApiResponse<ImportStepResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<ImportStepResponse>>(`${this.BASE}/import`, formData);
  }

  remapImport(token: string, mapping: Record<string, string>): Observable<ApiResponse<ImportStepResponse>> {
    return this.http.post<ApiResponse<ImportStepResponse>>(`${this.BASE}/import/remap`, { token, mapping });
  }

  confirmImport(importToken: string): Observable<ApiResponse<ImportConfirmData>> {
    return this.http.post<ApiResponse<ImportConfirmData>>(
      `${this.BASE}/import/confirm`,
      { importToken }
    );
  }

  exportCatalog(amms: string[]): Observable<Blob> {
    return this.http.post(
      `${this.BASE}/export`,
      { amms },
      { responseType: 'blob' }
    );
  }

  getMedications(filter: MedicationFilter = {}): Observable<ApiResponse<MedicationPageDTO>> {
    let params = new HttpParams();
    if (filter.search)      params = params.set('search', filter.search);
    if (filter.classe)      params = params.set('classe', filter.classe);
    if (filter.sousClasse)  params = params.set('sousClasse', filter.sousClasse);
    if (filter.laboratoire) params = params.set('laboratoire', filter.laboratoire);
    if (filter.veic)        params = params.set('veic', filter.veic);
    if (filter.isActive != null) params = params.set('isActive', String(filter.isActive));
    params = params.set('page', String(filter.page ?? 0));
    params = params.set('size', String(filter.size ?? 9999));
    return this.http.get<ApiResponse<MedicationPageDTO>>(`${this.BASE}/medications`, { params });
  }

  toggleActive(amm: string, active: boolean): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(
      `${this.BASE}/medications/${encodeURIComponent(amm)}/active`,
      { active }
    );
  }

  updateMedication(amm: string, dto: MedicationUpdateRequest): Observable<ApiResponse<MedicationDTO>> {
    return this.http.put<ApiResponse<MedicationDTO>>(
      `${this.BASE}/medications/${encodeURIComponent(amm)}`,
      dto
    );
  }

  deleteAllMedications(): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.BASE}/medications`);
  }
}
