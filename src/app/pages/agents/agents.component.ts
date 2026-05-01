import { Component, OnInit } from '@angular/core';
import { AdminService, OrderDTO, LivreurAdmin } from '../../services/admin.service';
import { DeliveryZoneService, DeliveryZone } from '../../services/delivery-zone.service';

@Component({
  selector: 'app-agents',
  templateUrl: './agents.component.html',
  styleUrls: ['./agents.component.scss']
})
export class AgentsComponent implements OnInit {
  searchTerm = '';
  statusFilter = 'all';
  zoneFilter: 'all' | 'unassigned' = 'all';

  livreurs: LivreurAdmin[] = [];
  allOrders: OrderDTO[] = [];
  zones: DeliveryZone[] = [];
  loading = false;

  // Assign order modal
  assignTarget: LivreurAdmin | null = null;
  assignLoading = false;
  selectedOrderId: number | null = null;

  // Assign zone modal
  zoneTarget: LivreurAdmin | null = null;
  selectedZoneId: number | null = null;
  zoneLoading = false;

  constructor(
    private adminService: AdminService,
    private zoneService: DeliveryZoneService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.adminService.getLivreurs().subscribe({
      next: livs => { this.livreurs = livs; this.loading = false; },
      error: () => { this.loading = false; }
    });
    this.adminService.getOrders().subscribe({
      next: orders => { this.allOrders = orders; }
    });
    this.zoneService.getAll().subscribe({
      next: res => { this.zones = res.data ?? []; }
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
      const matchZone = this.zoneFilter === 'all' || !this.hasDeliveryZone(l);
      return matchSearch && matchStatus && matchZone;
    });
  }

  get assignableOrders(): OrderDTO[] {
    return this.allOrders.filter(o =>
      o.status === 'PENDING' || o.status === 'READY_FOR_DELIVERY'
    );
  }

  // ── Order assign ──────────────────────────────────────────────────────────

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

  // ── Zone assign ───────────────────────────────────────────────────────────

  openZoneAssign(l: LivreurAdmin) {
    this.zoneTarget = l;
    this.selectedZoneId = l.zoneId ?? null;
  }

  closeZoneAssign() {
    this.zoneTarget = null;
    this.selectedZoneId = null;
    this.zoneLoading = false;
  }

  confirmZoneAssign() {
    if (!this.zoneTarget || !this.selectedZoneId) return;
    this.zoneLoading = true;
    this.zoneService.assignLivreur(this.zoneTarget.id, this.selectedZoneId).subscribe({
      next: res => {
        this.applyZoneUpdate(this.zoneTarget!.id, res.data);
        this.zoneLoading = false;
        this.closeZoneAssign();
      },
      error: () => { this.zoneLoading = false; }
    });
  }

  confirmUnassignZone() {
    if (!this.zoneTarget) return;
    this.zoneLoading = true;
    this.zoneService.unassignLivreur(this.zoneTarget.id).subscribe({
      next: res => {
        this.applyZoneUpdate(this.zoneTarget!.id, res.data);
        this.zoneLoading = false;
        this.closeZoneAssign();
      },
      error: () => { this.zoneLoading = false; }
    });
  }

  private applyZoneUpdate(livreurId: number, updated: any) {
    const idx = this.livreurs.findIndex(l => l.id === livreurId);
    if (idx !== -1) {
      this.livreurs[idx] = {
        ...this.livreurs[idx],
        zoneId: updated.zoneId,
        zoneName: updated.zoneName
      };
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  initials(email: string): string {
    return (email || '?')[0].toUpperCase();
  }

  hasDeliveryZone(livreur: LivreurAdmin): boolean {
    return livreur.zoneId != null || !!livreur.zoneName?.trim();
  }

  toggleUnassignedFilter(): void {
    this.zoneFilter = this.zoneFilter === 'unassigned' ? 'all' : 'unassigned';
  }

  countOnline()      { return this.livreurs.filter(l => l.online).length; }
  countOffline()     { return this.livreurs.filter(l => !l.online).length; }
  countWithoutZone() { return this.livreurs.filter(l => !this.hasDeliveryZone(l)).length; }
}
