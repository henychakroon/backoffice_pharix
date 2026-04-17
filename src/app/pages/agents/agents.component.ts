import { Component, OnInit } from '@angular/core';
import { AdminService, OrderDTO, LivreurAdmin } from '../../services/admin.service';

@Component({
  selector: 'app-agents',
  templateUrl: './agents.component.html',
  styleUrls: ['./agents.component.scss']
})
export class AgentsComponent implements OnInit {
  searchTerm = '';
  statusFilter = 'all';

  livreurs: LivreurAdmin[] = [];
  allOrders: OrderDTO[] = [];
  loading = false;

  // Assign modal
  assignTarget: LivreurAdmin | null = null;
  assignLoading = false;
  selectedOrderId: number | null = null;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loading = true;
    this.adminService.getLivreurs().subscribe({
      next: livs => { this.livreurs = livs; this.loading = false; },
      error: () => { this.loading = false; }
    });
    this.adminService.getOrders().subscribe({
      next: orders => { this.allOrders = orders; }
    });
  }

  get filtered(): LivreurAdmin[] {
    return this.livreurs.filter(l => {
      const term = this.searchTerm.toLowerCase();
      const matchSearch = !this.searchTerm ||
        l.email.toLowerCase().includes(term) ||
        (l.phone ?? '').includes(term) ||
        (l.zoneName ?? '').toLowerCase().includes(term);
      const matchStatus = this.statusFilter === 'all' ||
        (this.statusFilter === 'online' && l.online) ||
        (this.statusFilter === 'offline' && !l.online);
      return matchSearch && matchStatus;
    });
  }

  get assignableOrders(): OrderDTO[] {
    return this.allOrders.filter(o =>
      o.status === 'PENDING' || o.status === 'READY_FOR_DELIVERY'
    );
  }

  openAssign(l: LivreurAdmin) {
    this.assignTarget = l;
    this.selectedOrderId = null;
  }

  closeAssign() {
    this.assignTarget = null;
    this.selectedOrderId = null;
  }

  confirmAssign() {
    if (!this.assignTarget || !this.selectedOrderId) return;
    this.assignLoading = true;
    this.adminService.assignLivreurToOrder(this.selectedOrderId, this.assignTarget.id).subscribe({
      next: updated => {
        const idx = this.allOrders.findIndex(o => o.id === updated.id);
        if (idx !== -1) this.allOrders[idx] = updated;
        this.assignLoading = false;
        this.closeAssign();
      },
      error: () => { this.assignLoading = false; }
    });
  }

  initials(email: string): string {
    return (email || '?')[0].toUpperCase();
  }

  countOnline() { return this.livreurs.filter(l => l.online).length; }
  countOffline() { return this.livreurs.filter(l => !l.online).length; }
}
