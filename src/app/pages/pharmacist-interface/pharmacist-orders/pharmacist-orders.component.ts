import { Component, OnInit } from '@angular/core';
import { PharmacistService } from '../../../services/pharmacist.service';
import { AuthService } from '../../../services/auth.service';
import { OrderDTO } from '../../../services/admin.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-pharmacist-orders',
  templateUrl: './pharmacist-orders.component.html',
  styleUrls: ['./pharmacist-orders.component.scss']
})
export class PharmacistOrdersComponent implements OnInit {
  allOrders: OrderDTO[] = [];
  loading = true;
  searchTerm = '';
  statusFilter = 'all';
  actionLoading: number | null = null;
  email = '';

  // Detail drawer
  selectedOrder: OrderDTO | null = null;

  // QR modal
  qrModalOrder: OrderDTO | null = null;
  qrDataUrl = '';

  constructor(
    private pharmacistService: PharmacistService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.email = user?.email ?? '';
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.pharmacistService.getOrders(this.email).subscribe({
      next: orders => {
        this.allOrders = orders;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get filtered(): OrderDTO[] {
    return this.allOrders.filter(o => {
      const term = this.searchTerm.toLowerCase();
      const matchSearch = !this.searchTerm ||
        String(o.id).includes(term) ||
        (o.clientName ?? '').toLowerCase().includes(term);
      const matchStatus = this.statusFilter === 'all' || o.status === this.statusFilter;
      return matchSearch && matchStatus;
    });
  }

  countByStatus(s: string): number {
    return this.allOrders.filter(o => o.status === s).length;
  }

  statusBadge(s: string): string {
    const m: Record<string, string> = {
      PENDING: 'badge-warning',
      ASSIGNED: 'badge-primary',
      ACCEPTED: 'badge-info',
      PICKED_UP: 'badge-info',
      DELIVERING: 'badge-info',
      DELIVERED: 'badge-success',
      REFUSED: 'badge-danger',
      CANCELLED: 'badge-danger',
      READY_FOR_DELIVERY: 'badge-accent',
      DISPATCH_FAILED: 'badge-dispatch-failed'
    };
    return m[s] ?? 'badge-gray';
  }

  statusLabel(s: string): string {
    const l: Record<string, string> = {
      PENDING: 'En attente',
      ASSIGNED: 'Assigné',
      ACCEPTED: 'Acceptée',
      PICKED_UP: 'Récupérée',
      DELIVERING: 'En livraison',
      DELIVERED: 'Livrée',
      REFUSED: 'Refusée',
      CANCELLED: 'Annulée',
      READY_FOR_DELIVERY: 'Prête',
      DISPATCH_FAILED: 'Echec dispatch'
    };
    return l[s] ?? s;
  }

  // ── Actions ──

  acceptOrder(o: OrderDTO, event: Event): void {
    event.stopPropagation();
    this.actionLoading = o.id;
    this.pharmacistService.acceptOrder(o.id, this.email).subscribe({
      next: updated => { this.replaceOrder(updated); this.actionLoading = null; },
      error: () => { this.actionLoading = null; }
    });
  }

  refuseOrder(o: OrderDTO, event: Event): void {
    event.stopPropagation();
    this.actionLoading = o.id;
    this.pharmacistService.refuseOrder(o.id, this.email).subscribe({
      next: updated => { this.replaceOrder(updated); this.actionLoading = null; },
      error: () => { this.actionLoading = null; }
    });
  }

  markReady(o: OrderDTO, event: Event): void {
    event.stopPropagation();
    this.actionLoading = o.id;
    this.pharmacistService.markReady(o.id, this.email).subscribe({
      next: updated => { this.replaceOrder(updated); this.actionLoading = null; },
      error: () => { this.actionLoading = null; }
    });
  }

  // ── QR Code ──

  async showQr(o: OrderDTO, event: Event): Promise<void> {
    event.stopPropagation();
    this.qrModalOrder = o;
    this.qrDataUrl = await QRCode.toDataURL(String(o.id), {
      width: 280,
      margin: 2,
      color: { dark: '#0c3f6c', light: '#ffffff' }
    });
  }

  closeQr(): void {
    this.qrModalOrder = null;
    this.qrDataUrl = '';
  }

  printQr(): void {
    const o = this.qrModalOrder;
    if (!o) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const fmt = (n: number) => n.toFixed(2) + ' TND';
    w.document.write(`
      <html><head><title>QR Commande #${o.id}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:'Segoe UI',sans-serif;padding:24px;color:#1a1a1a;}
        .header{font-size:22px;font-weight:700;margin-bottom:4px;}
        .sub{color:#666;font-size:13px;margin-bottom:16px;}
        img{width:240px;height:240px;margin-bottom:16px;}
        .info{width:300px;border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:12px;}
        .row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px;}
        .row.total{border-top:1.5px solid #333;margin-top:6px;padding-top:10px;font-weight:700;font-size:16px;}
        .label{color:#666;}
        .client{text-align:center;margin-bottom:16px;font-size:13px;color:#555;}
        .footer{margin-top:8px;font-size:11px;color:#999;}
      </style></head>
      <body>
        <div class="header">Commande #${o.id}</div>
        <div class="sub">${new Date(o.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
        <img id="qr" src="${this.qrDataUrl}">
        <div class="client">Client: <strong>${o.clientName}</strong>${o.clientPhone ? ' · ' + o.clientPhone : ''}</div>
        <div class="info">
          <div class="row"><span class="label">Sous-total</span><span>${fmt(o.subtotal)}</span></div>
          <div class="row"><span class="label">Livraison</span><span>${fmt(o.deliveryPrice)}</span></div>
          <div class="row total"><span>Total</span><span>${fmt(o.total)}</span></div>
        </div>
        <div class="footer">Scannez le QR pour identifier la commande</div>
        <script>document.getElementById('qr').onload=function(){window.print();window.close();};</script>
      </body></html>
    `);
    w.document.close();
  }

  // ── Detail drawer ──

  openDetail(o: OrderDTO): void { this.selectedOrder = o; }
  closeDetail(): void { this.selectedOrder = null; }

  // ── Helpers ──

  private replaceOrder(updated: OrderDTO): void {
    const idx = this.allOrders.findIndex(o => o.id === updated.id);
    if (idx !== -1) this.allOrders[idx] = updated;
    if (this.selectedOrder?.id === updated.id) this.selectedOrder = updated;
  }
}
