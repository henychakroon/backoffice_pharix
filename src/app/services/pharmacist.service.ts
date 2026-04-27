import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { OrderDTO } from './admin.service';

export interface PharmacienDashboard {
  totalOrders: number;
  pendingOrders: number;
  acceptedOrders: number;
  readyForDeliveryOrders: number;
  deliveredOrders: number;
  refusedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
}

export interface CreateReportPayload {
  reportedUserId: number;
  type: string;
  description: string;
}

export interface ReportItem {
  id: number;
  type: string;
  description: string;
  status: string;
  createdAt: string;
  reporterId: number;
  reporterEmail: string;
  reporterRole: string;
  reportedId: number;
  reportedEmail: string;
  reportedRole: string;
}

export interface PharmacistProductItem {
  productId: number;
  amm: string;
  productName: string;
  imageUrl: string | null;
  description: string | null;
  dci: string;
  dosage: string;
  forme: string;
  laboratoire: string;
  categoryName: string;
  subCategoryId: number;
  subCategoryName: string;
  referencePrice: number | null;
  available: boolean;
  editable: boolean;
}

export interface PharmacistProductPage {
  content: PharmacistProductItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface PharmacistProductFilters {
  categories: string[];
  subCategories: string[];
  paramedicalSubCategories: PharmacistProductSubCategoryOption[];
}

export interface PharmacistProductSubCategoryOption {
  id: number;
  name: string;
  categoryName: string;
}

export interface PharmacistProductQuery {
  productIds?: number[];
  search?: string;
  category?: string;
  subCategory?: string;
  available?: boolean | null;
  page?: number;
  size?: number;
}

export interface PharmacistParamedicalProductPayload {
  name: string;
  description?: string;
  subCategoryId: number;
  referencePrice: number;
}

export interface NearbyPharmacy {
  id: number;
  pharmacyName: string;
  ownerName: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  closedToday: boolean;
  openingTime: string | null;
  closingTime: string | null;
  distanceKm: number;
  imageUrl: string | null;
}

export interface PharmacienProfile {
  id: number;
  online: boolean;
  pharmacyName: string;
  ownerName: string;
}

export interface PharmacienNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data: {
    orderId: number | null;
    clientName: string | null;
    clientPhone: string | null;
    total: number | null;
    status: string | null;
    pharmacyId: number | null;
    createdAt: string;
    isRead: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class PharmacistService {
  private readonly BASE = '/api/v1/pharmacien';

  constructor(private http: HttpClient) {}

  getOrders(email: string, status?: string): Observable<OrderDTO[]> {
    let params = new HttpParams().set('email', email);
    if (status) params = params.set('status', status);
    return this.http.get<OrderDTO[]>(`${this.BASE}/orders`, { params });
  }

  getOrder(orderId: number): Observable<OrderDTO> {
    return this.http.get<OrderDTO>(`${this.BASE}/orders/${orderId}`);
  }

  acceptOrder(orderId: number, email: string): Observable<OrderDTO> {
    return this.http.put<OrderDTO>(`${this.BASE}/orders/${orderId}/accept`, {}, {
      params: new HttpParams().set('email', email)
    });
  }

  refuseOrder(orderId: number, email: string): Observable<OrderDTO> {
    return this.http.put<OrderDTO>(`${this.BASE}/orders/${orderId}/refuse`, {}, {
      params: new HttpParams().set('email', email)
    });
  }

  markReady(orderId: number, email: string): Observable<OrderDTO> {
    return this.http.put<OrderDTO>(`${this.BASE}/orders/${orderId}/ready`, {}, {
      params: new HttpParams().set('email', email)
    });
  }

  undoReady(orderId: number, email: string): Observable<OrderDTO> {
    return this.http.put<OrderDTO>(`${this.BASE}/orders/${orderId}/ready/undo`, {}, {
      params: new HttpParams().set('email', email)
    });
  }

  pickupOrder(orderId: number): Observable<OrderDTO> {
    return this.http.put<OrderDTO>(`${this.BASE}/orders/${orderId}/pickup`, {});
  }

  deliverOrder(orderId: number): Observable<OrderDTO> {
    return this.http.put<OrderDTO>(`${this.BASE}/orders/${orderId}/deliver`, {});
  }

  getDashboard(email: string): Observable<PharmacienDashboard> {
    return this.http.get<PharmacienDashboard>(`${this.BASE}/dashboard`, {
      params: new HttpParams().set('email', email)
    });
  }

  getProducts(query: PharmacistProductQuery = {}): Observable<PharmacistProductPage> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 25));

    if (query.productIds?.length) {
      query.productIds.forEach(productId => {
        params = params.append('productIds', String(productId));
      });
    }
    if (query.search) params = params.set('search', query.search);
    if (query.category) params = params.set('category', query.category);
    if (query.subCategory) params = params.set('subCategory', query.subCategory);
    if (query.available != null) params = params.set('available', String(query.available));

    return this.http.get<PharmacistProductPage>(`${this.BASE}/products`, { params });
  }

  getProductFilters(): Observable<PharmacistProductFilters> {
    return this.http.get<PharmacistProductFilters>(`${this.BASE}/products/filters`);
  }

  getNearbyPharmacies(latitude: number, longitude: number, radiusKm = 10): Observable<NearbyPharmacy[]> {
    const url = '/api/v1/location/nearest-pharmacien';
    const params = new HttpParams()
      .set('latitude', String(latitude))
      .set('longitude', String(longitude))
      .set('radiusKm', String(radiusKm));

    return this.http.get<NearbyPharmacy[]>(url, { params }).pipe(
      tap(pharmacies => console.log('Nearby pharmacies request', { url, latitude, longitude, radiusKm }, pharmacies))
    );
  }

  updateProductAvailability(productId: number, available: boolean): Observable<PharmacistProductItem> {
    return this.http.patch<PharmacistProductItem>(`${this.BASE}/products/${productId}/availability`, { available });
  }

  createParamedicalProduct(
    payload: PharmacistParamedicalProductPayload,
    image?: File | null
  ): Observable<PharmacistProductItem> {
    return this.http.post<PharmacistProductItem>(`${this.BASE}/products`, this.buildProductFormData(payload, image));
  }

  updateParamedicalProduct(
    productId: number,
    payload: PharmacistParamedicalProductPayload,
    image?: File | null
  ): Observable<PharmacistProductItem> {
    return this.http.put<PharmacistProductItem>(`${this.BASE}/products/${productId}`, this.buildProductFormData(payload, image));
  }

  deleteParamedicalProduct(productId: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/products/${productId}`);
  }

  createReport(payload: CreateReportPayload): Observable<ReportItem> {
    return this.http.post<ReportItem>('/api/v1/reports', payload);
  }

  getMyReports(): Observable<ReportItem[]> {
    return this.http.get<ReportItem[]>('/api/v1/reports/me');
  }

  startDelivering(orderId: number): Observable<OrderDTO> {
    return this.http.put<OrderDTO>(`${this.BASE}/orders/${orderId}/delivering`, {});
  }

  getReadyOrdersForLivreur(livreurId: number): Observable<OrderDTO[]> {
    return this.http.get<OrderDTO[]>(`${this.BASE}/livreur/${livreurId}/ready-orders`);
  }

  getProfile(): Observable<PharmacienProfile> {
    return this.http.get<PharmacienProfile>(`${this.BASE}/profile`);
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  getNotifications(): Observable<PharmacienNotification[]> {
    return this.http.get<PharmacienNotification[]>(`${this.BASE}/notifications`);
  }

  getUnreadNotifications(): Observable<PharmacienNotification[]> {
    return this.http.get<PharmacienNotification[]>(`${this.BASE}/notifications/unread`);
  }

  getUnreadNotificationCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.BASE}/notifications/unread/count`);
  }

  markNotificationRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.BASE}/notifications/${id}/read`, {});
  }

  markAllNotificationsRead(): Observable<void> {
    return this.http.put<void>(`${this.BASE}/notifications/read-all`, {});
  }

  private buildProductFormData(
    payload: PharmacistParamedicalProductPayload,
    image?: File | null
  ): FormData {
    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));
    if (image) {
      formData.append('image', image);
    }
    return formData;
  }
}
