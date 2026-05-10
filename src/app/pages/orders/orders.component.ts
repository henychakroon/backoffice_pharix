import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminService, OrderDTO, LivreurAdmin, OrderCancellationSummary } from '../../services/admin.service';
import { WebSocketService, AdminOrderEvent } from '../../services/websocket.service';
import { formatCancelledOrderLabel, getCancellationRoleLabel, getOrderStatusBadge, getOrderStatusLabel } from '../../shared/order-status';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {
  searchTerm = '';
  statusFilter = 'all';
  cancelledByRoleFilter = 'all';
  selectedOrder: OrderDTO | null = null;
  loading = false;
  highlightedId: number | null = null;

  allOrders: OrderDTO[] = [];
  livreurs: LivreurAdmin[] = [];
  cancellationSummary: OrderCancellationSummary[] = [];

  // Assign modal
  assignModalOrder: OrderDTO | null = null;
  assignLoading = false;
  selectedLivreurId: number | null = null;

  private wsSub?: Subscription;

  constructor(
    private adminService: AdminService,
    private route: ActivatedRoute,
    private ws: WebSocketService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    this.loadCancellationSummary();
    this.route.queryParams.subscribe(params => {
      const id = params['highlight'] ? +params['highlight'] : null;
      if (id) {
        this.highlightedId = id;
        this.statusFilter = 'all';
        this.cancelledByRoleFilter = 'all';
        this.loadOrders();
        setTimeout(() => {
          const el = document.getElementById('order-row-' + id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => { this.highlightedId = null; }, 4000);
        }, 100);
      }
    });
    this.adminService.getLivreurs().subscribe({
      next: livs => { this.livreurs = livs; }
    });

    // Patch order status in real-time from WebSocket events
    this.wsSub = this.ws.orderEvents$.subscribe((event: AdminOrderEvent) => {
      const idx = this.allOrders.findIndex(o => o.id === event.orderId);
      if (idx !== -1) {
        this.allOrders[idx] = {
          ...this.allOrders[idx],
          status: event.status,
          cancellationReason: event.cancellationReason ?? this.allOrders[idx].cancellationReason,
          cancelledByRole: event.cancelledByRole ?? this.allOrders[idx].cancelledByRole
        };
        if (this.selectedOrder?.id === event.orderId) {
          this.selectedOrder = {
            ...this.selectedOrder,
            status: event.status,
            cancellationReason: event.cancellationReason ?? this.selectedOrder.cancellationReason,
            cancelledByRole: event.cancelledByRole ?? this.selectedOrder.cancelledByRole
          };
        }
      } else if (event.status === 'DISPATCH_FAILED' || event.status === 'CANCELLED') {
        this.loadOrders();
        this.loadCancellationSummary();
      }
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  get filtered(): OrderDTO[] {
    return this.allOrders
      .filter(o => {
        const term = this.searchTerm.toLowerCase();
        const matchSearch = !this.searchTerm ||
          String(o.id).includes(term) ||
          (o.clientName ?? '').toLowerCase().includes(term) ||
          (o.pharmacyName ?? '').toLowerCase().includes(term);
        const matchStatus = this.statusFilter === 'all' || o.status === this.statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private loadOrders(): void {
    this.loading = true;
    const status = this.statusFilter !== 'all' ? this.statusFilter : undefined;
    const cancelledByRole = this.cancelledByRoleFilter !== 'all' ? this.cancelledByRoleFilter : undefined;
    this.adminService.getOrders(status, cancelledByRole).subscribe({
      next: orders => {
        this.allOrders = orders;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private loadCancellationSummary(): void {
    this.adminService.getOrderCancellationSummary().subscribe({
      next: summary => { this.cancellationSummary = summary; }
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    if (status !== 'CANCELLED') {
      this.cancelledByRoleFilter = 'all';
    }
    this.loadOrders();
  }

  setCancelledByRoleFilter(cancelledByRole: string): void {
    this.cancelledByRoleFilter = cancelledByRole;
    if (cancelledByRole !== 'all' && this.statusFilter !== 'CANCELLED') {
      this.statusFilter = 'CANCELLED';
    }
    this.loadOrders();
  }

  cancellationRoleLabel(role?: string | null): string {
    return getCancellationRoleLabel(role);
  }

  statusLabelForOrder(order: OrderDTO): string {
    if (order.status === 'CANCELLED' && order.cancelledByRole) {
      return formatCancelledOrderLabel(order.cancelledByRole);
    }
    return this.statusLabel(order.status);
  }

  cancellationBadgeClass(order: OrderDTO): string | null {
    if (order.status !== 'CANCELLED' || !order.cancelledByRole) {
      return null;
    }
    return order.cancelledByRole === 'LIVREUR' ? 'badge-cancelled-livreur' : 'badge-cancelled-other';
  }

  cancellationSummaryCount(role: string): number {
    return this.cancellationSummary.find(item => item.cancelledByRole === role)?.count ?? 0;
  }

  statusBadge(s: string) {
    return getOrderStatusBadge(s);
  }

  statusLabel(s: string) {
    return getOrderStatusLabel(s);
  }

  openDetail(o: OrderDTO) { this.selectedOrder = o; }
  closeDetail() { this.selectedOrder = null; }

  countByStatus(s: string) {
    return this.allOrders.filter(o => o.status === s).length;
  }

  openAssign(o: OrderDTO, event: Event) {
    event.stopPropagation();
    this.assignModalOrder = o;
    this.selectedLivreurId = o.livreurId ?? null;
  }

  closeAssign() {
    this.assignModalOrder = null;
    this.selectedLivreurId = null;
  }

  confirmAssign() {
    if (!this.assignModalOrder || !this.selectedLivreurId) return;
    this.assignLoading = true;
    this.adminService.assignLivreurToOrder(this.assignModalOrder.id, this.selectedLivreurId).subscribe({
      next: updated => {
        const idx = this.allOrders.findIndex(o => o.id === updated.id);
        if (idx !== -1) this.allOrders[idx] = updated;
        if (this.selectedOrder?.id === updated.id) this.selectedOrder = updated;
        this.assignLoading = false;
        this.closeAssign();
      },
      error: () => { this.assignLoading = false; }
    });
  }

  livreurDisplay(l: LivreurAdmin): string {
    return l.email + (l.vehicleType ? ' � ' + l.vehicleType : '');
  }
}
