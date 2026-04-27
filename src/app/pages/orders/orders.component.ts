import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminService, OrderDTO, LivreurAdmin } from '../../services/admin.service';
import { WebSocketService, AdminOrderEvent } from '../../services/websocket.service';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {
  searchTerm = '';
  statusFilter = 'all';
  selectedOrder: OrderDTO | null = null;
  loading = false;
  highlightedId: number | null = null;

  allOrders: OrderDTO[] = [];
  livreurs: LivreurAdmin[] = [];

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
    this.loading = true;
    this.adminService.getOrders().subscribe({
      next: orders => {
        this.allOrders = orders;
        this.loading = false;
        this.route.queryParams.subscribe(params => {
          const id = params['highlight'] ? +params['highlight'] : null;
          if (id) {
            this.highlightedId = id;
            // Reset statusFilter so the row is visible
            this.statusFilter = 'all';
            // Scroll after render
            setTimeout(() => {
              const el = document.getElementById('order-row-' + id);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Clear highlight after 4s
              setTimeout(() => { this.highlightedId = null; }, 4000);
            }, 100);
          }
        });
      },
      error: () => { this.loading = false; }
    });
    this.adminService.getLivreurs().subscribe({
      next: livs => { this.livreurs = livs; }
    });

    // Patch order status in real-time from WebSocket events
    this.wsSub = this.ws.orderEvents$.subscribe((event: AdminOrderEvent) => {
      const idx = this.allOrders.findIndex(o => o.id === event.orderId);
      if (idx !== -1) {
        this.allOrders[idx] = { ...this.allOrders[idx], status: event.status };
        if (this.selectedOrder?.id === event.orderId) {
          this.selectedOrder = { ...this.selectedOrder, status: event.status };
        }
      } else if (event.status === 'DISPATCH_FAILED') {
        // New stuck order not yet in our list — refresh
        this.adminService.getOrders().subscribe(orders => { this.allOrders = orders; });
      }
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  get filtered(): OrderDTO[] {
    return this.allOrders.filter(o => {
      const term = this.searchTerm.toLowerCase();
      const matchSearch = !this.searchTerm ||
        String(o.id).includes(term) ||
        (o.clientName ?? '').toLowerCase().includes(term) ||
        (o.pharmacyName ?? '').toLowerCase().includes(term);
      const matchStatus = this.statusFilter === 'all' || o.status === this.statusFilter;
      return matchSearch && matchStatus;
    });
  }

  statusBadge(s: string) {
    const m: Record<string, string> = {
      PENDING: 'badge-warning',
      ASSIGNED: 'badge-primary',
      ACCEPTED: 'badge-info',
      PICKED_UP: 'badge-info',
      DELIVERING: 'badge-info',
      DELIVERED: 'badge-success',
      REFUSED: 'badge-danger',
      CANCELLED: 'badge-danger',
      READY_FOR_DELIVERY: 'badge-primary',
      DISPATCH_FAILED: 'badge-dispatch-failed',
      ACCEPTED_FROM_PHARMACIEN: 'badge-info',
      REFUSED_FROM_PHARMACIEN: 'badge-danger',
      ACCEPTED_FROM_LIVREUR: 'badge-primary',
      REFUSED_FROM_LIVREUR: 'badge-danger'
    };
    return m[s] ?? 'badge-gray';
  }

  statusLabel(s: string) {
    const l: Record<string, string> = {
      PENDING: 'En attente',
      ASSIGNED: 'Assigne',
      ACCEPTED: 'Accepte',
      PICKED_UP: 'Recupere',
      DELIVERING: 'En livraison',
      DELIVERED: 'Livre',
      REFUSED: 'Refuse',
      CANCELLED: 'Annule',
      READY_FOR_DELIVERY: 'Pret',
      DISPATCH_FAILED: 'Echec dispatch',
      ACCEPTED_FROM_PHARMACIEN: 'Acceptee',
      REFUSED_FROM_PHARMACIEN: 'Refusee',
      ACCEPTED_FROM_LIVREUR: 'Livreur OK',
      REFUSED_FROM_LIVREUR: 'Livreur refuse'
    };
    return l[s] ?? s;
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
