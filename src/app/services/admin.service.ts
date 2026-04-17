import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── Model interfaces matching spring-boot responses ──────────────────────────

export interface PharmacienProfile {
  id: number;
  pharmacyName: string;
  ownerName: string;
  online: boolean;
  active: boolean;
  latitude: number;
  longitude: number;
  email: string;
  phone: string;
  deliveryZoneName?: string;
  pharmacyType?: 'PHARMACY' | 'PARAPHARMACIE';
}

export interface ClientProfile {
  id: number;
  fullName: string;
  latitude: number;
  longitude: number;
  user: {
    id: number;
    email: string;
    phone: string;
  };
}

export interface OrderDTO {
  id: number;
  status: string;
  description?: string;

  clientId: number;
  clientName: string;
  clientPhone?: string;

  vendorId: number;
  pharmacyName: string;
  pharmacyPhone?: string;

  livreurId?: number;
  livreurName?: string;
  livreurPhone?: string;

  subtotal: number;
  deliveryPrice: number;
  total: number;

  createdAt: string;
  updatedAt?: string;
}

export interface LivreurAdmin {
  id: number;
  userId: number;
  email: string;
  phone?: string;
  vehicleType?: string;
  online: boolean;
  zoneId?: number;
  zoneName?: string;
}

export interface Category {
  id: number;
  name: string;
  pharmacyType: string;
}

export interface DeliveryConfig {
  id: number;
  deliveryPrice: number;
  freeDeliveryThreshold: number;
}

export interface AdvertisementBanner {
  id: number;
  title: string;
  description: string;
  image: string | null; // base64
  validated: boolean;
  active: boolean;
  pharmacienId: number;
  pharmacyName: string;
  ownerName: string;
  zoneId: number | null;
  zoneName: string | null;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly BASE = '/api/v1/admin';

  constructor(private http: HttpClient) {}

  // Pharmacies
  getPharmacies(): Observable<PharmacienProfile[]> {
    return this.http.get<PharmacienProfile[]>(`${this.BASE}/pharmacies`);
  }

  activatePharmacy(id: number): Observable<PharmacienProfile> {
    return this.http.put<PharmacienProfile>(`${this.BASE}/pharmacies/${id}/activate`, {});
  }

  blockPharmacy(id: number): Observable<PharmacienProfile> {
    return this.http.put<PharmacienProfile>(`${this.BASE}/pharmacies/${id}/block`, {});
  }

  // Clients
  getClients(): Observable<ClientProfile[]> {
    return this.http.get<ClientProfile[]>(`${this.BASE}/clients`);
  }

  // Orders
  getOrders(): Observable<OrderDTO[]> {
    return this.http.get<OrderDTO[]>(`${this.BASE}/orders`);
  }

  getLivreurs(): Observable<LivreurAdmin[]> {
    return this.http.get<LivreurAdmin[]>(`${this.BASE}/livreurs`);
  }

  assignLivreurToOrder(orderId: number, livreurId: number): Observable<OrderDTO> {
    return this.http.put<OrderDTO>(`${this.BASE}/orders/${orderId}/assign/${livreurId}`, {});
  }

  // Categories
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.BASE}`);
  }

  // Delivery config
  getDeliveryConfig(): Observable<DeliveryConfig> {
    return this.http.get<DeliveryConfig>(`${this.BASE}/config`);
  }

  saveDeliveryConfig(deliveryPrice: number, freeDeliveryThreshold: number): Observable<DeliveryConfig> {
    return this.http.post<DeliveryConfig>(`${this.BASE}/save_config`, { deliveryPrice, freeDeliveryThreshold });
  }

  // Advertisement Banners
  getBanners(): Observable<AdvertisementBanner[]> {
    return this.http.get<AdvertisementBanner[]>(`${this.BASE}/banners`);
  }

  getPendingBanners(): Observable<AdvertisementBanner[]> {
    return this.http.get<AdvertisementBanner[]>(`${this.BASE}/banners/pending`);
  }

  validateBanner(id: number): Observable<void> {
    return this.http.put<void>(`${this.BASE}/banner/${id}/validate`, {});
  }

  toggleBanner(id: number): Observable<void> {
    return this.http.put<void>(`${this.BASE}/banner/${id}/toggle`, {});
  }

  rejectBanner(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/banner/${id}`);
  }
}
