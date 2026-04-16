import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ZonePoint {
  latitude: number;
  longitude: number;
  orderIndex: number;
}

export interface DeliveryZone {
  id: number;
  name: string;
  active: boolean;
  createdBy: number | null;
  points: ZonePoint[];
  livreurCount: number;
  pharmacyCount: number;
}

export interface ZoneCreateRequest {
  name: string;
  points: { latitude: number; longitude: number }[];
}

export interface LivreurSummary {
  id: number;
  userId: number;
  email: string;
  phone: string | null;
  vehicleType: string | null;
  online: boolean;
  zoneId: number | null;
  zoneName: string | null;
}

export interface PharmacySummary {
  id: number;
  pharmacyName: string | null;
  ownerName: string | null;
  email: string | null;
  online: boolean | null;
  latitude: number | null;
  longitude: number | null;
  zoneId: number | null;
  zoneName: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class DeliveryZoneService {
  private readonly BASE = '/api/zones';

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<DeliveryZone[]>> {
    return this.http.get<ApiResponse<DeliveryZone[]>>(this.BASE);
  }

  create(dto: ZoneCreateRequest): Observable<ApiResponse<DeliveryZone>> {
    return this.http.post<ApiResponse<DeliveryZone>>(this.BASE, dto);
  }

  update(id: number, dto: ZoneCreateRequest): Observable<ApiResponse<DeliveryZone>> {
    return this.http.put<ApiResponse<DeliveryZone>>(`${this.BASE}/${id}`, dto);
  }

  toggleActive(id: number, active: boolean): Observable<ApiResponse<DeliveryZone>> {
    return this.http.patch<ApiResponse<DeliveryZone>>(`${this.BASE}/${id}/active`, { active });
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.BASE}/${id}`);
  }

  // ── Livreur assignment ──────────────────────────────────────────────────────

  getAllLivreurs(): Observable<ApiResponse<LivreurSummary[]>> {
    return this.http.get<ApiResponse<LivreurSummary[]>>(`${this.BASE}/livreurs`);
  }

  assignLivreur(livreurId: number, zoneId: number): Observable<ApiResponse<LivreurSummary>> {
    return this.http.patch<ApiResponse<LivreurSummary>>(
      `${this.BASE}/livreurs/${livreurId}/assign/${zoneId}`, {});
  }

  unassignLivreur(livreurId: number): Observable<ApiResponse<LivreurSummary>> {
    return this.http.patch<ApiResponse<LivreurSummary>>(
      `${this.BASE}/livreurs/${livreurId}/unassign`, {});
  }

  // ── Pharmacy ────────────────────────────────────────────────────────────────

  getZonePharmacies(zoneId: number): Observable<ApiResponse<PharmacySummary[]>> {
    return this.http.get<ApiResponse<PharmacySummary[]>>(`${this.BASE}/${zoneId}/pharmacies`);
  }

  syncPharmacies(zoneId: number): Observable<ApiResponse<PharmacySummary[]>> {
    return this.http.post<ApiResponse<PharmacySummary[]>>(`${this.BASE}/${zoneId}/pharmacies/sync`, {});
  }
}
