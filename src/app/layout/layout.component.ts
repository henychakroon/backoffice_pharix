import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { WebSocketService, AdminOrderEvent, PharmacienOrderEvent } from '../services/websocket.service';
import { PharmacistService, PharmacienNotification } from '../services/pharmacist.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  mobileOpen = false;
  currentRoute = '';

  notifCount = 0;
  notifPanelOpen = false;
  recentOrders: AdminOrderEvent[] = [];

  // Pharmacien-specific
  pharmacienNotifCount = 0;
  pharmacienNotifPanelOpen = false;
  recentPharmacienEvents: PharmacienOrderEvent[] = [];

  private wsSub?: Subscription;
  private pharmacienWsSub?: Subscription;

  adminNavItems = [
    {
      group: 'Main',
      items: [
        { label: 'Dashboard',         icon: 'grid',        route: '/dashboard'  },
        { label: 'Orders',            icon: 'shopping-bag',route: '/orders'     },
      ]
    },
    {
      group: 'Actors',
      items: [
        { label: 'Users',             icon: 'users',       route: '/users'      },
        { label: 'Clients',           icon: 'users',       route: '/clients'    },
        { label: 'Pharmacies',        icon: 'plus-square', route: '/pharmacies' },
        { label: 'Delivery Agents',   icon: 'truck',       route: '/agents'     },
      ]
    },
    {
      group: 'Catalogue',
      items: [
        { label: 'Products',          icon: 'package',     route: '/products'   },
        { label: 'Categories',        icon: 'tag',         route: '/categories' },
      ]
    },
    {
      group: 'Operations',
      items: [
        { label: 'Reports',           icon: 'flag',        route: '/reports'    },
        { label: 'Analytics',         icon: 'bar-chart-2', route: '/analytics'  },
        { label: 'Settings',          icon: 'settings',    route: '/settings'   },
      ]
    },
    {
      group: 'Livraison',
      items: [
        { label: 'Zones de livraison', icon: 'map-pin',     route: '/zones'      },
      ]
    }
  ];

  pharmacistNavItems = [
    {
      group: 'Main',
      items: [
        { label: 'Tableau de bord',   icon: 'grid',        route: '/ph/dashboard' },
        { label: 'Pharmacies proches', icon: 'map-pin',     route: '/ph/nearby-pharmacies' },
        { label: 'Mes commandes',     icon: 'shopping-bag', route: '/ph/orders'   },
        { label: 'Mes produits',      icon: 'package',      route: '/ph/products' },
        { label: 'Horaires',          icon: 'clock',        route: '/ph/schedule' },
      ]
    }
  ];

  get navItems() {
    return this.auth.isPharmacien() ? this.pharmacistNavItems : this.adminNavItems;
  }

  get userDisplayName(): string {
    const u = this.auth.getCurrentUser();
    if (u?.ownerName) return u.ownerName;
    return 'Admin Pharix';
  }

  get userRole(): string {
    return this.auth.isPharmacien() ? 'Pharmacien' : 'Super Admin';
  }

  get userInitial(): string {
    return (this.userDisplayName[0] || 'A').toUpperCase();
  }

  get brandBadge(): string {
    return this.auth.isPharmacien() ? 'Pharmacie' : 'Admin';
  }

  constructor(
    private router: Router,
    public auth: AuthService,
    private ws: WebSocketService,
    private pharmacistService: PharmacistService
  ) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentRoute = e.urlAfterRedirects;
        this.mobileOpen = false;
      });
  }

  ngOnInit(): void {
    if (this.auth.isAdmin()) {
      const token = this.auth.getAccessToken();
      if (token) {
        this.ws.connect(token);
        this.wsSub = this.ws.orderEvents$.subscribe((event: AdminOrderEvent) => {
          this.notifCount++;
          this.recentOrders.unshift(event);
          if (this.recentOrders.length > 10) this.recentOrders.pop();
        });
      }
    }

    if (this.auth.isPharmacien()) {
      const token = this.auth.getAccessToken();
      if (token) {
        // Fetch profile to get pharmacienId for WS subscription
        this.pharmacistService.getProfile().subscribe({
          next: (profile) => {
            this.ws.connectPharmacien(token, profile.id);
            this.pharmacienWsSub = this.ws.pharmacienOrderEvents$.subscribe(
              (event: PharmacienOrderEvent) => this.onPharmacienOrderEvent(event)
            );
          },
          error: (err) => console.warn('[Layout] Could not load pharmacien profile for WS', err)
        });

        // Load initial unread count
        this.pharmacistService.getUnreadNotificationCount().subscribe({
          next: (res) => { this.pharmacienNotifCount = res.count; },
          error: () => {}
        });
      }
    }
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.pharmacienWsSub?.unsubscribe();
    this.ws.disconnect();
  }

  private onPharmacienOrderEvent(event: PharmacienOrderEvent): void {
    // Play sound only for new incoming orders
    if (event.status === 'PENDING') {
      this.playNewOrderSound();
    }

    this.pharmacienNotifCount++;
    this.recentPharmacienEvents.unshift(event);
    if (this.recentPharmacienEvents.length > 10) this.recentPharmacienEvents.pop();
  }

  private playNewOrderSound(): void {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx() as AudioContext;
      // Two-tone chime: 880Hz then 660Hz
      [880, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = ctx.currentTime + i * 0.25;
        gain.gain.setValueAtTime(0.35, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch {
      // Browser blocked audio or API not available — silent fail
    }
  }

  // ── Admin notification helpers ─────────────────────────────────────────────

  clearNotifications(): void {
    this.notifCount = 0;
    this.recentOrders = [];
  }

  toggleNotifPanel(): void {
    this.notifPanelOpen = !this.notifPanelOpen;
    if (!this.notifPanelOpen) this.notifCount = 0;
  }

  goToOrder(orderId: number): void {
    this.notifPanelOpen = false;
    this.notifCount = 0;
    this.router.navigate(['/orders'], { queryParams: { highlight: orderId } });
  }

  // ── Pharmacien notification helpers ──────────────────────────────────────

  clearPharmacienNotifications(): void {
    this.pharmacienNotifCount = 0;
    this.recentPharmacienEvents = [];
    this.pharmacistService.markAllNotificationsRead().subscribe();
  }

  togglePharmacienNotifPanel(): void {
    this.pharmacienNotifPanelOpen = !this.pharmacienNotifPanelOpen;
    if (!this.pharmacienNotifPanelOpen) this.pharmacienNotifCount = 0;
  }

  goToPharmacienOrder(orderId: number): void {
    this.pharmacienNotifPanelOpen = false;
    this.pharmacienNotifCount = 0;
    this.router.navigate(['/ph/orders'], { queryParams: { highlight: orderId } });
  }

  statusLabelFr(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Nouvelle commande',
      ACCEPTED_FROM_PHARMACIEN: 'Acceptée',
      READY_FOR_DELIVERY: 'Prête',
      ASSIGNED: 'Livreur assigné',
      ACCEPTED_FROM_LIVREUR: 'Livreur en route',
      PICKED_UP: 'Récupérée',
      DELIVERING: 'En livraison',
      DELIVERED: 'Livrée',
      DISPATCH_FAILED: 'Aucun livreur',
      REFUSED_FROM_PHARMACIEN: 'Refusée',
      CANCELLED: 'Annulée',
    };
    return map[status] ?? status;
  }

  toggle() { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleMobile() { this.mobileOpen = !this.mobileOpen; }
  logout() { this.auth.logout(); }

  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }
}
