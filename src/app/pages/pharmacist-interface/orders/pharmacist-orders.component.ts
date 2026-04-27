import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone } from '@angular/core';
import { PharmacistService, CreateReportPayload } from '../../../services/pharmacist.service';
import { AuthService } from '../../../services/auth.service';
import { OrderDTO } from '../../../services/admin.service';
import { Router, ActivatedRoute } from '@angular/router';
import { from, Subscription } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import * as QRCode from 'qrcode';
import jsQR from 'jsqr';
import { WebSocketService, PharmacienOrderEvent } from '../../../services/websocket.service';

@Component({
  selector: 'app-pharmacist-orders',
  templateUrl: './pharmacist-orders.component.html',
  styleUrls: ['./pharmacist-orders.component.scss']
})
export class PharmacistOrdersComponent implements OnInit, OnDestroy {
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

  // Report modal
  reportModalOrder: OrderDTO | null = null;
  reportTargetLabel = '';
  reportTargetName = '';
  reportTargetUserId: number | null = null;
  reportType = 'ORDER';
  reportDescription = '';
  reportSubmitting = false;
  reportError = '';
  reportSuccess = '';

  // QR Scanner
  @ViewChild('scannerVideo') scannerVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('scannerCanvas') scannerCanvasRef!: ElementRef<HTMLCanvasElement>;
  scannerOpen = false;
  scannerStream: MediaStream | null = null;
  scannerError = '';
  scannerSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  // livreur QR result
  scannedLivreurId: number | null = null;
  scannedLivreurOrders: OrderDTO[] = [];
  livreurOrdersLoading = false;
  confirmingOrderId: number | null = null;
  scanConfirmError = '';
  manualOrderId = '';
  private scanInterval: any = null;

  // Highlighted order (from notification click)
  highlightedOrderId: number | null = null;
  private highlightTimer: any = null;

  private wsSub?: Subscription;

  constructor(
    private pharmacistService: PharmacistService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private ws: WebSocketService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.email = user?.email ?? '';
    this.loadOrders();

    // Handle highlight query param from notification click
    this.route.queryParams.subscribe(params => {
      if (params['highlight']) {
        const id = Number(params['highlight']);
        if (!isNaN(id)) {
          this.highlightedOrderId = id;
          this.statusFilter = 'all';
          if (this.highlightTimer) clearTimeout(this.highlightTimer);
          this.highlightTimer = setTimeout(() => { this.highlightedOrderId = null; }, 4000);
        }
      }
    });

    // Subscribe to real-time order events via WebSocket
    this.wsSub = this.ws.pharmacienOrderEvents$.subscribe((event: PharmacienOrderEvent) => {
      this.ngZone.run(() => this.handleOrderEvent(event));
    });
  }

  private handleOrderEvent(event: PharmacienOrderEvent): void {
    if (event.status === 'PENDING') {
      // New order: reload full list to include it
      this.loadOrders();
      return;
    }
    // For other lifecycle events: update status in place
    const idx = this.allOrders.findIndex(o => o.id === event.orderId);
    if (idx !== -1) {
      this.allOrders[idx] = { ...this.allOrders[idx], status: event.status };
      if (this.selectedOrder?.id === event.orderId) {
        this.selectedOrder = { ...this.selectedOrder, status: event.status };
      }
    } else {
      // Unknown order arrived (e.g. ASSIGNED after page load): reload
      this.loadOrders();
    }
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
      PENDING:                  'badge-warning',
      ACCEPTED_FROM_PHARMACIEN: 'badge-info',
      REFUSED_FROM_PHARMACIEN:  'badge-danger',
      READY_FOR_DELIVERY:       'badge-accent',
      DISPATCH_FAILED:          'badge-dispatch-failed',
      ASSIGNED:                 'badge-primary',
      ACCEPTED_FROM_LIVREUR:    'badge-primary',
      REFUSED_FROM_LIVREUR:     'badge-danger',
      PICKED_UP:                'badge-info',
      DELIVERING:               'badge-info',
      DELIVERED:                'badge-success',
      CANCELLED:                'badge-danger'
    };
    return m[s] ?? 'badge-gray';
  }

  statusLabel(s: string): string {
    const l: Record<string, string> = {
      PENDING:                  'En attente',
      ACCEPTED_FROM_PHARMACIEN: 'Acceptée',
      REFUSED_FROM_PHARMACIEN:  'Refusée',
      READY_FOR_DELIVERY:       'Prête',
      DISPATCH_FAILED:          'Echec dispatch',
      ASSIGNED:                 'Assigné',
      ACCEPTED_FROM_LIVREUR:    'Pris en charge',
      REFUSED_FROM_LIVREUR:     'Refusé (livreur)',
      PICKED_UP:                'Récupérée',
      DELIVERING:               'En livraison',
      DELIVERED:                'Livrée',
      CANCELLED:                'Annulée'
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

  undoReady(o: OrderDTO, event: Event): void {
    event.stopPropagation();
    this.actionLoading = o.id;
    this.pharmacistService.undoReady(o.id, this.email).subscribe({
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

  openReport(order: OrderDTO, event: Event, target: 'client' | 'livreur'): void {
    event.stopPropagation();
    this.reportModalOrder = order;
    this.reportType = target === 'livreur' ? 'DELIVERY' : 'ORDER';
    this.reportDescription = '';
    this.reportError = '';
    this.reportSuccess = '';

    if (target === 'livreur') {
      this.reportTargetLabel = 'Livreur';
      this.reportTargetName = order.livreurName || 'Livreur';
      this.reportTargetUserId = order.livreurUserId ?? null;
    } else {
      this.reportTargetLabel = 'Client';
      this.reportTargetName = order.clientName || 'Client';
      this.reportTargetUserId = order.clientUserId ?? null;
    }
  }

  closeReport(): void {
    this.reportModalOrder = null;
    this.reportTargetLabel = '';
    this.reportTargetName = '';
    this.reportTargetUserId = null;
    this.reportType = 'ORDER';
    this.reportDescription = '';
    this.reportSubmitting = false;
    this.reportError = '';
    this.reportSuccess = '';
  }

  submitReport(): void {
    if (!this.reportTargetUserId) {
      this.reportError = 'Utilisateur cible introuvable pour ce signalement.';
      return;
    }
    if (!this.reportDescription.trim()) {
      this.reportError = 'La description est obligatoire.';
      return;
    }

    const payload: CreateReportPayload = {
      reportedUserId: this.reportTargetUserId,
      type: this.reportType,
      description: this.reportDescription.trim()
    };

    this.reportSubmitting = true;
    this.reportError = '';
    this.reportSuccess = '';
    this.pharmacistService.createReport(payload).subscribe({
      next: () => {
        this.reportSubmitting = false;
        this.reportSuccess = 'Signalement envoyé avec succès.';
        this.reportDescription = '';
      },
      error: (err) => {
        this.reportSubmitting = false;
        this.reportError = err?.error?.message || err?.error?.error || 'Impossible d\'envoyer le signalement.';
      }
    });
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

  ngOnDestroy(): void {
    this.stopScanner();
    this.wsSub?.unsubscribe();
    if (this.highlightTimer) clearTimeout(this.highlightTimer);
  }

  // ── QR Scanner ──

  openScanner(): void {
    this.scannerOpen = true;
    this.scannedLivreurId = null;
    this.scannedLivreurOrders = [];
    this.scannerError = '';
    this.scanConfirmError = '';
    this.manualOrderId = '';
    if (this.scannerSupported) {
      setTimeout(() => this.startCamera(), 100);
    }
  }

  closeScanner(): void {
    this.stopScanner();
    this.scannerOpen = false;
    this.scannedLivreurId = null;
    this.scannedLivreurOrders = [];
    this.scannerError = '';
    this.scanConfirmError = '';
    this.manualOrderId = '';
  }

  private async startCamera(): Promise<void> {
    try {
      this.scannerStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      const video = this.scannerVideoRef?.nativeElement;
      if (video) {
        video.srcObject = this.scannerStream;
        await video.play();
        this.startDecodeLoop();
      }
    } catch {
      this.ngZone.run(() => {
        this.scannerError = 'Impossible d\'accéder à la caméra. Utilisez la saisie manuelle.';
      });
    }
  }

  private startDecodeLoop(): void {
    const canvas = this.scannerCanvasRef?.nativeElement;
    const video = this.scannerVideoRef?.nativeElement;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d')!;

    this.scanInterval = setInterval(() => {
      if (video.readyState < 2 || this.scannedLivreurId !== null) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        this.ngZone.run(() => this.handleScannedValue(code.data));
      }
    }, 300);
  }

  private stopScanner(): void {
    if (this.scanInterval) { clearInterval(this.scanInterval); this.scanInterval = null; }
    if (this.scannerStream) {
      this.scannerStream.getTracks().forEach(t => t.stop());
      this.scannerStream = null;
    }
  }

  private handleScannedValue(raw: string): void {
    const id = parseInt(raw, 10);
    if (isNaN(id)) {
      this.scannerError = 'QR invalide — valeur non reconnue.';
      return;
    }
    this.stopScanner();
    this.fetchLivreurOrders(id);
  }

  submitManualScan(): void {
    const id = parseInt(this.manualOrderId, 10);
    if (isNaN(id) || id <= 0) {
      this.scannerError = 'Numéro de livreur invalide.';
      return;
    }
    this.scannerError = '';
    this.fetchLivreurOrders(id);
  }

  private fetchLivreurOrders(livreurId: number): void {
    this.scannerError = '';
    this.scanConfirmError = '';
    this.livreurOrdersLoading = true;
    this.pharmacistService.getReadyOrdersForLivreur(livreurId).subscribe({
      next: orders => {
        this.scannedLivreurId = livreurId;
        this.scannedLivreurOrders = orders;
        this.livreurOrdersLoading = false;
      },
      error: err => {
        this.livreurOrdersLoading = false;
        this.scannerError = err?.error?.error || `Livreur #${livreurId} introuvable ou aucun accès.`;
      }
    });
  }

  confirmDelivering(order: OrderDTO): void {
    this.confirmingOrderId = order.id;
    this.scanConfirmError = '';
    this.pharmacistService.startDelivering(order.id).subscribe({
      next: updated => {
        this.replaceOrder(updated);
        this.scannedLivreurOrders = this.scannedLivreurOrders.filter(o => o.id !== order.id);
        this.confirmingOrderId = null;
        if (this.scannedLivreurOrders.length === 0) {
          this.closeScanner();
        }
      },
      error: err => {
        this.confirmingOrderId = null;
        this.scanConfirmError = err?.error?.error || 'Impossible de mettre à jour le statut.';
      }
    });
  }

  confirmAllDelivering(): void {
    const pending = [...this.scannedLivreurOrders];
    if (!pending.length) return;
    this.scanConfirmError = '';
    this.confirmingOrderId = -1; // sentinel: "all loading"
    from(pending).pipe(
      concatMap(o => this.pharmacistService.startDelivering(o.id))
    ).subscribe({
      next: updated => {
        this.replaceOrder(updated);
        this.scannedLivreurOrders = this.scannedLivreurOrders.filter(o => o.id !== updated.id);
      },
      error: err => {
        this.confirmingOrderId = null;
        this.scanConfirmError = err?.error?.error || 'Une erreur est survenue.';
      },
      complete: () => {
        this.confirmingOrderId = null;
        this.closeScanner();
      }
    });
  }

  // ── Detail drawer ──

  openDetail(o: OrderDTO): void { this.selectedOrder = o; }
  closeDetail(): void { this.selectedOrder = null; }

  openProductsForOrder(order: OrderDTO, event: Event): void {
    event.stopPropagation();

    const productIds = (order.orderItems ?? [])
      .map(item => item.productId)
      .filter((productId, index, all) => productId != null && all.indexOf(productId) === index);

    this.router.navigate(['/ph/products'], {
      queryParams: {
        orderId: order.id,
        productIds: productIds.length > 0 ? productIds.join(',') : null,
        orderDescription: order.description || '',
        clientName: order.clientName || ''
      }
    });
  }

  // ── Helpers ──

  isHighlighted(orderId: number): boolean {
    return this.highlightedOrderId === orderId;
  }

  private replaceOrder(updated: OrderDTO): void {
    const idx = this.allOrders.findIndex(o => o.id === updated.id);
    if (idx !== -1) this.allOrders[idx] = updated;
    if (this.selectedOrder?.id === updated.id) this.selectedOrder = updated;
  }
}
