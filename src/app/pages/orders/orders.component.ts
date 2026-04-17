import { Component, OnInit } from '@angular/core';
import { AdminService, OrderDTO, LivreurAdmin } from '../../services/admin.service';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {
  searchTerm = '';
  statusFilter = 'all';
  selectedOrder: OrderDTO | null = null;
  loading = false;

  allOrders: OrderDTO[] = [];
  livreurs: LivreurAdmin[] = [];

  // Assign modal
  assignModalOrder: OrderDTO | null = null;
  assignLoading = false;
  selectedLivreurId: number | null = null;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loading = true;
    this.adminService.getOrders().subscribe({
      next: orders => { this.allOrders = orders; this.loading = false; },
      error: () => { this.loading = false; }
    });
    this.adminService.getLivreurs().subscribe({
      next: livs => { this.livreurs = livs; }
    });
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
      READY_FOR_DELIVERY: 'badge-primary'
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
      READY_FOR_DELIVERY: 'Pret'
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
    return l.email + (l.vehicleType ? ' · ' + l.vehicleType : '');
  }
}
