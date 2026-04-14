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
  user: {
    id: number;
    email: string;
    phone: string;
  };
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

export interface Order {
  id: number;
  description: string;
  status: string;
  subtotal: number;
  deliveryPrice: number;
  total: number;
  clientId: { id: number; fullName: string };
  vendorId: { id: number; pharmacyName: string };
  liv?: { id: number };
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
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.BASE}/orders`);
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
}
