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
  totalCouponsRedeemed: number;
  totalDiscountGiven: number;
}

export type CouponType = 'PERCENT' | 'FIXED';
export type CouponScope = 'PRODUCT' | 'CATEGORY' | 'PHARMACY_WIDE';
export type CouponApprovalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface CouponRefItem { id: number; name: string; }

export interface Coupon {
  id: number;
  code: string;
  pharmacyId: number;
  pharmacyName?: string;
  type: CouponType;
  value: number;
  scope: CouponScope;
  products?: CouponRefItem[];
  categories?: CouponRefItem[];
  minSubtotal?: number | null;
  maxDiscount?: number | null;
  validFrom: string;
  validTo: string;
  maxRedemptions?: number | null;
  maxRedemptionsPerClient?: number | null;
  active: boolean;
  approvalStatus?: CouponApprovalStatus | null;
  approvalNote?: string | null;
  approvalReviewedBy?: string | null;
  approvalReviewedAt?: string | null;
  createdAt: string;
  redemptionCount?: number;
  totalDiscountGiven?: number;
}

export interface CouponUpsert {
  code: string;
  type: CouponType;
  value: number;
  scope: CouponScope;
  productIds?: number[];
  categoryIds?: number[];
  minSubtotal?: number | null;
  maxDiscount?: number | null;
  validFrom: string;          // ISO local datetime
  validTo: string;
  maxRedemptions?: number | null;
  maxRedemptionsPerClient?: number | null;
  active?: boolean;
}

export interface CouponScopeOptions {
  products: CouponRefItem[];
  categories: CouponRefItem[];
}

export interface CouponNotificationRecipient {
  id: number;
  fullName: string;
  phone?: string | null;
  email?: string | null;
}

export interface CouponNotificationRequest {
  notifyAllClients: boolean;
  clientIds?: number[];
  title?: string;
  message?: string;
}

export interface CouponNotificationResult {
  sentCount: number;
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

export interface OrdonnanceAccess {
  url: string;
  mimeType?: string | null;
  fileName?: string | null;
}

export interface PharmacienBanner {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  validated: boolean;
  active: boolean;
  pharmacienId: number;
  pharmacyName: string;
  ownerName: string;
  zoneId: number | null;
  zoneName: string | null;
}

export interface ClientHealthProfile {
  fullName?: string | null;
  age?: number | null;
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  hasHealthProblems?: boolean | null;
  hasPathologicalHistory?: boolean | null;
  hasOngoingTreatment?: boolean | null;
  ongoingTreatments?: string[] | null;
  hasAllergicHistory?: boolean | null;
  allergies?: string[] | null;
  hasReducedMobility?: boolean | null;
  ordonnanceUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type PharmacienReviewDecision = 'ACCEPT_UNCHANGED' | 'REVISE' | 'REFUSE';

export interface PharmacienReviewDecisionRequest {
  decision: PharmacienReviewDecision;
  note?: string;
  reason?: string;
  expiresInMinutes?: number;
  couponCode?: string | null;
  sendViaChat?: boolean;
  chatMessage?: string;
  items?: Array<{ productId: number; quantity: number }>;
}

export interface OrderChatMessage {
  id: number;
  conversationId: number;
  orderId: number;
  revisionNumber?: number | null;
  senderId: number;
  senderRole: string;
  messageType: 'TEXT' | 'REVIEW_REQUEST' | string;
  content: string;
  timestamp: string;
  seen: boolean;
}

export interface OrderChatThread {
  conversationId: number;
  orderId: number;
  clientId: number;
  pharmacienId: number;
  clientName?: string | null;
  pharmacyName?: string | null;
  orderStatus?: string | null;
  activeRevisionNumber?: number | null;
  revisionExpiresAt?: string | null;
  messages: OrderChatMessage[];
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

  getOrdonnanceAccess(orderId: number): Observable<OrdonnanceAccess> {
    return this.http.get<OrdonnanceAccess>(`${this.BASE}/orders/${orderId}/ordonnance-access`);
  }

  getClientProfileOrdonnanceAccess(orderId: number): Observable<OrdonnanceAccess> {
    return this.http.get<OrdonnanceAccess>(`${this.BASE}/orders/${orderId}/client-profile/ordonnance-access`);
  }

  getClientHealthProfile(orderId: number): Observable<ClientHealthProfile> {
    return this.http.get<ClientHealthProfile>(`${this.BASE}/orders/${orderId}/client-profile`);
  }

  reviewDecision(orderId: number, payload: PharmacienReviewDecisionRequest): Observable<OrderDTO> {
    return this.http.post<OrderDTO>(`${this.BASE}/orders/${orderId}/review/decision`, payload);
  }

  getOrderChat(orderId: number): Observable<OrderChatThread> {
    return this.http.get<OrderChatThread>(`/api/v1/chat/orders/${orderId}`);
  }

  sendOrderChatMessage(orderId: number, content: string): Observable<OrderChatMessage> {
    return this.http.post<OrderChatMessage>(`/api/v1/chat/orders/${orderId}/messages`, { content });
  }

  acceptOrder(orderId: number, email: string): Observable<OrderDTO> {
    void email;
    return this.reviewDecision(orderId, { decision: 'ACCEPT_UNCHANGED' });
  }

  refuseOrder(orderId: number, email: string): Observable<OrderDTO> {
    void email;
    return this.reviewDecision(orderId, { decision: 'REFUSE' });
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

  getAdminPhoneNumbers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.BASE}/admin-phone-numbers`);
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

  // ── Advertisement banners ─────────────────────────────────────────────────

  getMyBanners(): Observable<PharmacienBanner[]> {
    return this.http.get<PharmacienBanner[]>(`${this.BASE}/banners`);
  }

  createBanner(title: string, description: string, image?: File | null): Observable<PharmacienBanner> {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    if (image) formData.append('image', image);
    return this.http.post<PharmacienBanner>(`${this.BASE}/banners`, formData);
  }

  deleteBanner(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/banners/${id}`);
  }

  // ── Coupons ─────────────────────────────────────────────────────────────
  listCoupons(): Observable<Coupon[]> {
    return this.http.get<Coupon[]>(`${this.BASE}/coupons`);
  }

  getCouponScopeOptions(): Observable<CouponScopeOptions> {
    return this.http.get<CouponScopeOptions>(`${this.BASE}/coupons/scope-options`);
  }

  getCouponNotificationRecipients(): Observable<CouponNotificationRecipient[]> {
    return this.http.get<CouponNotificationRecipient[]>(`${this.BASE}/coupons/notification-recipients`);
  }

  createCoupon(payload: CouponUpsert): Observable<Coupon> {
    return this.http.post<Coupon>(`${this.BASE}/coupons`, payload);
  }

  updateCoupon(id: number, payload: CouponUpsert): Observable<Coupon> {
    return this.http.put<Coupon>(`${this.BASE}/coupons/${id}`, payload);
  }

  toggleCoupon(id: number): Observable<Coupon> {
    return this.http.patch<Coupon>(`${this.BASE}/coupons/${id}/toggle`, {});
  }

  submitCouponForReview(id: number): Observable<Coupon> {
    return this.http.patch<Coupon>(`${this.BASE}/coupons/${id}/submit`, {});
  }

  deleteCoupon(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/coupons/${id}`);
  }

  sendCouponNotification(id: number, payload: CouponNotificationRequest): Observable<CouponNotificationResult> {
    return this.http.post<CouponNotificationResult>(`${this.BASE}/coupons/${id}/notify`, payload);
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
