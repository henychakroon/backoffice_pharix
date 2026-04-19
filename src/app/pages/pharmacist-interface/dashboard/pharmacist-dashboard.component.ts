import { Component, OnInit } from '@angular/core';
import { PharmacistService, PharmacienDashboard } from '../../../services/pharmacist.service';
import { AuthService } from '../../../services/auth.service';
import { OrderDTO } from '../../../services/admin.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-pharmacist-dashboard',
  templateUrl: './pharmacist-dashboard.component.html',
  styleUrls: ['./pharmacist-dashboard.component.scss']
})
export class PharmacistDashboardComponent implements OnInit {
  dashboard: PharmacienDashboard | null = null;
  pendingOrders: OrderDTO[] = [];
  loading = true;
  actionLoading: number | null = null;
  pharmacyName = '';
  email = '';
  selectedOrder: OrderDTO | null = null;

  constructor(
    private pharmacistService: PharmacistService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.pharmacyName = user?.pharmacyName ?? '';
    this.email = user?.email ?? '';

    if (this.email) {
      this.loadData();
      return;
    }

    this.loading = false;
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      dashboard: this.pharmacistService.getDashboard(this.email),
      pendingOrders: this.pharmacistService.getOrders(this.email, 'PENDING')
    }).subscribe({
      next: ({ dashboard, pendingOrders }) => {
        this.dashboard = dashboard;
        this.pendingOrders = pendingOrders;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openDetail(order: OrderDTO): void {
    this.selectedOrder = order;
  }

  closeDetail(): void {
    this.selectedOrder = null;
  }

  acceptOrder(order: OrderDTO, event: Event): void {
    event.stopPropagation();
    this.actionLoading = order.id;
    this.pharmacistService.acceptOrder(order.id, this.email).subscribe({
      next: updated => {
        this.applyPendingOrderUpdate(updated);
        this.actionLoading = null;
      },
      error: () => {
        this.actionLoading = null;
      }
    });
  }

  refuseOrder(order: OrderDTO, event: Event): void {
    event.stopPropagation();
    this.actionLoading = order.id;
    this.pharmacistService.refuseOrder(order.id, this.email).subscribe({
      next: updated => {
        this.applyPendingOrderUpdate(updated);
        this.actionLoading = null;
      },
      error: () => {
        this.actionLoading = null;
      }
    });
  }

  statusBadge(status: string): string {
    const badges: Record<string, string> = {
      PENDING: 'badge-warning',
      ASSIGNED: 'badge-primary',
      ACCEPTED: 'badge-info',
      PICKED_UP: 'badge-info',
      DELIVERING: 'badge-info',
      DELIVERED: 'badge-success',
      REFUSED: 'badge-danger',
      CANCELLED: 'badge-danger',
      READY_FOR_DELIVERY: 'badge-accent'
    };

    return badges[status] ?? 'badge-gray';
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'En attente',
      ASSIGNED: 'Assigné',
      ACCEPTED: 'Acceptée',
      PICKED_UP: 'Récupérée',
      DELIVERING: 'En livraison',
      DELIVERED: 'Livrée',
      REFUSED: 'Refusée',
      CANCELLED: 'Annulée',
      READY_FOR_DELIVERY: 'Prête'
    };

    return labels[status] ?? status;
  }

  private applyPendingOrderUpdate(updated: OrderDTO): void {
    this.pendingOrders = this.pendingOrders.filter(order => order.id !== updated.id);

    if (this.selectedOrder?.id === updated.id) {
      this.selectedOrder = updated;
    }

    if (!this.dashboard) {
      return;
    }

    this.dashboard.pendingOrders = Math.max(0, this.dashboard.pendingOrders - 1);

    if (updated.status === 'ACCEPTED') {
      this.dashboard.acceptedOrders += 1;
    }

    if (updated.status === 'REFUSED') {
      this.dashboard.refusedOrders += 1;
    }
  }
}
