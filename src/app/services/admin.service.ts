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
  ordonnanceUrl?: string;
  ordonnanceMimeType?: string;
  ordonnanceFileName?: string;
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

export interface RevenueConfig {
  id?: number;
  medicamentServiceFee: number;
  parapharmacieCommissionPercent: number;
  pharmacistMonthlySubscription: number;
  nightDeliveryPrice: number;
  nightStartHour: number;
  nightEndHour: number;
}

export interface AdvertisementBanner {
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

export interface TopPharmacyDash {
  id: number;
  pharmacyName: string;
  ownerName: string;
  active: boolean;
  orderCount: number;
}

export interface DayStat {
  date: string;
  dayLabel: string;
  orderCount: number;
  revenue: number;
}

export interface CompanyRevenue {
  // Date-scoped (selected day)
  medicamentServiceFee: number;
  parapharmacieCommission: number;
  deliveryRevenue: number;
  totalDaily: number;

  // Recurring (monthly)
  subscriptionMonthly: number;
  subscriptionDailyProrated: number;

  // Context
  medicamentServiceFeeRate: number;
  parapharmacieCommissionPercent: number;
  pharmacistMonthlySubscription: number;
  medicamentOrders: number;
  parapharmacieSubtotal: number;
  activePharmacyCount: number;
}

export interface AdminDashboard {
  totalOrders: number;
  totalClients: number;
  activePharmacies: number;
  pendingOrders: number;
  deliveredOrders: number;
  inTransitOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  recentOrders: OrderDTO[];
  topPharmacies: TopPharmacyDash[];
  ordersByDay: DayStat[];
  companyRevenue: CompanyRevenue | null;
  monthlyRevenue: number;
}
// Add this interface alongside AdminDashboard
export interface MonthlyDashboard {
  year: number;
  month: number;
  monthLabel: string;

  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  inTransitOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  newClients: number;
  activePharmacies: number;

  revenueGrowthPct: number | null;
  orderGrowthPct:   number | null;

  dailyStats:         DayStatM[];
  weeklyStats:        WeekStat[];
  statusDistribution: StatusShare[];
  revenueByType:      PharmacyTypeRevenue[];
  topPharmacies:      TopPharmacyM[];
  dailyOutcomes:      DailyOutcome[];

  // Pharix's actual monthly revenue (the app's money, not pharmacies' GMV)
  companyRevenue:      CompanyRevenueMonthly | null;
  companyRevenueByDay: CompanyDailyRevenue[];
}

export interface CompanyRevenueMonthly {
  // Variable revenue (orders-driven)
  medicamentServiceFeeTotal:    number;
  parapharmacieCommissionTotal: number;
  deliveryRevenueTotal:         number;
  variableTotal:                number;

  // Recurring
  subscriptionMonthly:          number;

  // Grand total
  totalMonthly:                 number;

  // Configuration context
  medicamentServiceFeeRate:        number;
  parapharmacieCommissionPercent:  number;
  pharmacistMonthlySubscription:   number;

  // Underlying counts
  medicamentOrders:    number;
  parapharmacieSubtotal: number;
  activePharmacyCount: number;

  // Growth vs previous month
  growthPct: number | null;
}

export interface CompanyDailyRevenue {
  date:            string;
  dayLabel:        string;
  serviceFee:      number;
  commission:      number;
  deliveryRevenue: number;
  total:           number;
}

export interface DayStatM {
  date: string;
  dayLabel: string;
  orderCount: number;
  revenue: number;
}

export interface WeekStat {
  weekNumber: number;
  weekLabel: string;
  orderCount: number;
  revenue: number;
}

export interface StatusShare {
  status: string;
  count: number;
  percentage: number;
}

export interface PharmacyTypeRevenue {
  type: string;      // "MEDICAMENT" | "PARAPHARMACIE"
  revenue: number;
  orderCount: number;
}

export interface TopPharmacyM {
  id: number;
  pharmacyName: string;
  ownerName: string;
  active: boolean;
  orderCount: number;
  revenue: number;
}

export interface DailyOutcome {
  date: string;
  dayLabel: string;
  delivered: number;
  cancelled: number;
}


// ── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly BASE = '/api/v1/admin';

  constructor(private http: HttpClient) {}

  // Dashboard
  getDashboard(date?: string): Observable<AdminDashboard> {
    const q = date ? `?date=${date}` : '';
    return this.http.get<AdminDashboard>(`${this.BASE}/dashboard${q}`);
  }


  // Add this method inside AdminService
getMonthlyDashboard(year: number, month: number): Observable<MonthlyDashboard> {
  return this.http.get<MonthlyDashboard>(
    `${this.BASE}/dashboard/monthly?year=${year}&month=${month}`
  );
}


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

  // Revenue config (commissions, abonnements, frais service, livraison nuit)
  getRevenueConfig(): Observable<RevenueConfig> {
    return this.http.get<RevenueConfig>(`${this.BASE}/revenue_config`);
  }

  saveRevenueConfig(payload: RevenueConfig): Observable<RevenueConfig> {
    return this.http.post<RevenueConfig>(`${this.BASE}/save_revenue_config`, payload);
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
