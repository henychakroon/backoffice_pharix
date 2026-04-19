import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  dci: string;
  dosage: string;
  forme: string;
  laboratoire: string;
  categoryName: string;
  subCategoryName: string;
  referencePrice: number | null;
  available: boolean;
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
}

export interface PharmacistProductQuery {
  search?: string;
  category?: string;
  subCategory?: string;
  available?: boolean | null;
  page?: number;
  size?: number;
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

    if (query.search) params = params.set('search', query.search);
    if (query.category) params = params.set('category', query.category);
    if (query.subCategory) params = params.set('subCategory', query.subCategory);
    if (query.available != null) params = params.set('available', String(query.available));

    return this.http.get<PharmacistProductPage>(`${this.BASE}/products`, { params });
  }

  getProductFilters(): Observable<PharmacistProductFilters> {
    return this.http.get<PharmacistProductFilters>(`${this.BASE}/products/filters`);
  }

  updateProductAvailability(productId: number, available: boolean): Observable<PharmacistProductItem> {
    return this.http.patch<PharmacistProductItem>(`${this.BASE}/products/${productId}/availability`, { available });
  }

  createReport(payload: CreateReportPayload): Observable<ReportItem> {
    return this.http.post<ReportItem>('/api/v1/reports', payload);
  }

  getMyReports(): Observable<ReportItem[]> {
    return this.http.get<ReportItem[]>('/api/v1/reports/me');
  }
}
