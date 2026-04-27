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
  status?: 'ACTIVE' | 'PENDING' | 'BLOCKED';
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

export interface AdminUser {
  id: number;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'CLIENT' | 'PHARMACIEN' | 'LIVREUR';
  phoneVerified: boolean;
  banned: boolean;
  profileId?: number;
  displayName?: string;
  online?: boolean;
  active?: boolean;
  latitude?: number;
  longitude?: number;
  deliveryZoneId?: number;
  deliveryZoneName?: string;
  pharmacyName?: string;
  ownerName?: string;
  pharmacyType?: string;
  clientFullName?: string;
  livreurType?: string;
  vehicleType?: string;
}

export interface OrderDTO {
  id: number;
  status: string;
  description?: string;
  productId?: number;
  productName?: string;
  orderItems?: OrderItemDTO[];

  clientId: number;
  clientUserId?: number;
  clientName: string;
  clientPhone?: string;

  vendorId: number;
  vendorUserId?: number;
  pharmacyName: string;
  pharmacyPhone?: string;

  livreurId?: number;
  livreurUserId?: number;
  livreurName?: string;
  livreurPhone?: string;

  subtotal: number;
  deliveryPrice: number;
  total: number;

  createdAt: string;
  updatedAt?: string;
}

export interface OrderItemDTO {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
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

export interface AdminReport {
  id: number;
  type: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  reporterId: number;
  reporterEmail: string;
  reporterRole: string;
  reportedId: number;
  reportedEmail: string;
  reportedRole: string;
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

  acceptPharmacy(id: number): Observable<PharmacienProfile> {
    return this.http.put<PharmacienProfile>(`${this.BASE}/pharmacies/${id}/accept`, {});
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

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.BASE}/users`);
  }

  banUser(id: number): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.BASE}/users/${id}/ban`, {});
  }

  unbanUser(id: number): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.BASE}/users/${id}/unban`, {});
  }

  getReports(): Observable<AdminReport[]> {
    return this.http.get<AdminReport[]>('/api/v1/reports');
  }

  updateReportStatus(id: number, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'): Observable<AdminReport> {
    return this.http.put<AdminReport>(`/api/v1/reports/${id}/status`, { status });
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
