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

  createReport(payload: CreateReportPayload): Observable<ReportItem> {
    return this.http.post<ReportItem>('/api/v1/reports', payload);
  }

  getMyReports(): Observable<ReportItem[]> {
    return this.http.get<ReportItem[]>('/api/v1/reports/me');
  }
}
