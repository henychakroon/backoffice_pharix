import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { WebSocketService, AdminOrderEvent, PharmacienOrderEvent } from '../services/websocket.service';
import { PharmacistService, PharmacienNotification } from '../services/pharmacist.service';

interface OrderToast {
  uid: number;
  orderId: number;
  clientName: string;
  leaving: boolean;
  sticky?: boolean;
}

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
  pharmacienNotifications: PharmacienNotification[] = [];
  pharmacienNotifsLoading = false;

  toasts: OrderToast[] = [];
  toastIndex = 0;
  private toastUidCounter = 0;

  private wsSub?: Subscription;
  private pharmacienWsSub?: Subscription;
  private soundInterval: any = null;
  private adminAlertInterval: any = null;
  private tokenCheckInterval: any = null;
  private pendingPollInterval: any = null;
  private dismissedReminders = new Map<number, number>();
  private readonly REMINDER_SNOOZE_MS = 5 * 60 * 1000;
  private readonly PENDING_POLL_MS = 60 * 1000;

  adminNavItems = [
    {
      group: 'Main',
      items: [
        { label: 'Dashboard',         icon: 'grid',        route: '/dashboard'  },
        { label: 'Orders',            icon: 'shopping-bag',route: '/orders'     },
        { label: 'Monthly Dashboard', icon: 'bar-chart-2', route: '/dashboard/monthly' },
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
        { label: 'Coupons',           icon: 'tag',         route: '/coupons'    },
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
        { label: 'Codes promo',       icon: 'tag',          route: '/ph/coupons'  },
        { label: 'Mes bannières',     icon: 'image',        route: '/ph/banners'  },
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
    this.tokenCheckInterval = setInterval(() => {
      if (!this.auth.isLoggedIn()) {
        this.auth.clearSession();
        this.router.navigate(['/login']);
      }
    }, 30000);

    if (this.auth.isAdmin()) {
      const token = this.auth.getAccessToken();
      if (token) {
        this.ws.connect(token);
        this.wsSub = this.ws.orderEvents$.subscribe((event: AdminOrderEvent) => {
          this.notifCount++;
          this.recentOrders.unshift(event);
          if (this.recentOrders.length > 10) this.recentOrders.pop();
          if (event.status === 'DISPATCH_FAILED' || event.dispatchFailed) {
            this.playDispatchFailedAlert();
          }
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

        // Persistent reminders for unresolved PENDING orders
        this.loadPendingReminders();
        this.pendingPollInterval = setInterval(
          () => this.loadPendingReminders(),
          this.PENDING_POLL_MS
        );
      }
    }
  }

  ngOnDestroy(): void {
    if (this.tokenCheckInterval) clearInterval(this.tokenCheckInterval);
    if (this.pendingPollInterval) clearInterval(this.pendingPollInterval);
    this.wsSub?.unsubscribe();
    this.pharmacienWsSub?.unsubscribe();
    this.ws.disconnect();
    this.stopAdminAlert();
    this.stopSound();
  }

  private loadPendingReminders(): void {
    const email = this.auth.getCurrentUser()?.email;
    if (!email) return;
    this.pharmacistService.getOrders(email, 'PENDING').subscribe({
      next: (orders) => {
        const pendingIds = new Set(orders.map(o => o.id));

        // Clear toasts whose order is no longer PENDING
        for (const t of [...this.toasts]) {
          if (t.sticky && !pendingIds.has(t.orderId)) {
            this.dismissedReminders.delete(t.orderId);
            this.dismissToast(t.uid);
          }
        }

        // Add toast for each pending not already shown (and not snoozed)
        const now = Date.now();
        let addedAny = false;
        for (const o of orders) {
          if (this.toasts.some(t => t.orderId === o.id)) continue;
          const dismissedAt = this.dismissedReminders.get(o.id);
          if (dismissedAt && now - dismissedAt < this.REMINDER_SNOOZE_MS) continue;
          this.toasts.push({
            uid: ++this.toastUidCounter,
            orderId: o.id,
            clientName: o.clientName ?? 'Client',
            leaving: false,
            sticky: true,
          });
          addedAny = true;
        }
        if (addedAny) this.playNewOrderSound();
      },
      error: () => {}
    });
  }

  private onPharmacienOrderEvent(event: PharmacienOrderEvent): void {
    if (event.status === 'PENDING') {
      this.dismissedReminders.delete(event.orderId);
      this.playNewOrderSound();
      this.addToast(event, true);
    } else {
      // Order moved out of PENDING — clear any reminder toast
      const reminder = this.toasts.find(t => t.orderId === event.orderId);
      if (reminder) {
        this.dismissedReminders.delete(event.orderId);
        this.dismissToast(reminder.uid);
      }
    }

    this.pharmacienNotifCount++;
    this.recentPharmacienEvents.unshift(event);
    if (this.recentPharmacienEvents.length > 10) this.recentPharmacienEvents.pop();

    // If panel is open, reload the full list from DB to include the new item
    if (this.pharmacienNotifPanelOpen) {
      this.loadPharmacienNotifications();
    }
  }

  private addToast(event: PharmacienOrderEvent, sticky = false): void {
    if (this.toasts.some(t => t.orderId === event.orderId)) return;
    const uid = ++this.toastUidCounter;
    this.toasts.push({ uid, orderId: event.orderId, clientName: event.clientName, leaving: false, sticky });
    if (!sticky) setTimeout(() => this.dismissToast(uid), 8000);
  }

  dismissToast(uid: number): void {
    const toast = this.toasts.find(t => t.uid === uid);
    if (!toast || toast.leaving) return;
    if (toast.sticky) {
      this.dismissedReminders.set(toast.orderId, Date.now());
    }
    toast.leaving = true;
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.uid !== uid);
      this.clampToastIndex();
      if (this.toasts.length === 0) this.stopSound();
    }, 350);
  }

  viewToastOrder(toast: OrderToast): void {
    this.stopSound();
    this.dismissToast(toast.uid);
    this.goToPharmacienOrder(toast.orderId);
  }

  trackToast(_: number, t: OrderToast): number { return t.uid; }

  get currentToast(): OrderToast | null {
    return this.toasts[this.toastIndex] ?? null;
  }

  prevToast(): void {
    if (this.toasts.length === 0) return;
    this.toastIndex = (this.toastIndex - 1 + this.toasts.length) % this.toasts.length;
  }

  nextToast(): void {
    if (this.toasts.length === 0) return;
    this.toastIndex = (this.toastIndex + 1) % this.toasts.length;
  }

  private clampToastIndex(): void {
    if (this.toasts.length === 0) {
      this.toastIndex = 0;
    } else if (this.toastIndex >= this.toasts.length) {
      this.toastIndex = this.toasts.length - 1;
    }
  }

  private playNewOrderSound(): void {
    if (this.soundInterval) return; // already looping

    const playOnce = () => {
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx() as AudioContext;
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
        // Browser blocked audio — silent fail
      }
    };

    playOnce();
    let beeps = 1;
    this.soundInterval = setInterval(() => {
      playOnce();
      if (++beeps >= 5) this.stopSound();
    }, 2000);
  }

  private stopSound(): void {
    if (this.soundInterval) {
      clearInterval(this.soundInterval);
      this.soundInterval = null;
    }
  }

  private playDispatchFailedAlert(): void {
    if (this.adminAlertInterval) return;
    const playOnce = () => {
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx() as AudioContext;
        [440, 330, 220].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.value = freq;
          const start = ctx.currentTime + i * 0.18;
          gain.gain.setValueAtTime(0.25, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
          osc.start(start);
          osc.stop(start + 0.15);
        });
      } catch { }
    };
    playOnce();
    this.adminAlertInterval = setInterval(playOnce, 2500);
  }

  private stopAdminAlert(): void {
    if (this.adminAlertInterval) {
      clearInterval(this.adminAlertInterval);
      this.adminAlertInterval = null;
    }
  }

  // ── Admin notification helpers ─────────────────────────────────────────────

  clearNotifications(): void {
    this.stopAdminAlert();
    this.notifCount = 0;
    this.recentOrders = [];
  }

  toggleNotifPanel(): void {
    this.stopAdminAlert();
    this.notifPanelOpen = !this.notifPanelOpen;
    if (!this.notifPanelOpen) this.notifCount = 0;
  }

  goToOrder(orderId: number): void {
    this.notifPanelOpen = false;
    this.notifCount = 0;
    this.router.navigate(['/orders'], { queryParams: { highlight: orderId } });
  }

  // ── Pharmacien notification helpers ──────────────────────────────────────

  loadPharmacienNotifications(): void {
    this.pharmacienNotifsLoading = true;
    this.pharmacistService.getUnreadNotifications().subscribe({
      next: (list) => {
        this.pharmacienNotifications = list;
        this.pharmacienNotifCount = list.length;
        this.pharmacienNotifsLoading = false;
      },
      error: () => { this.pharmacienNotifsLoading = false; }
    });
  }

  markPharmacienNotifRead(notif: PharmacienNotification, event: Event): void {
    event.stopPropagation();
    if (notif.isRead) return;
    this.pharmacistService.markNotificationRead(notif.id).subscribe({
      next: () => {
        notif.isRead = true;
        this.pharmacienNotifCount = Math.max(0, this.pharmacienNotifCount - 1);
      }
    });
  }

  markAllPharmacienNotifsRead(): void {
    this.pharmacistService.markAllNotificationsRead().subscribe({
      next: () => {
        this.pharmacienNotifications.forEach(n => n.isRead = true);
        this.pharmacienNotifCount = 0;
      }
    });
  }

  clearPharmacienNotifications(): void {
    this.pharmacienNotifCount = 0;
    this.recentPharmacienEvents = [];
    this.pharmacistService.markAllNotificationsRead().subscribe();
  }

  togglePharmacienNotifPanel(): void {
    this.stopSound();
    this.pharmacienNotifPanelOpen = !this.pharmacienNotifPanelOpen;
    if (this.pharmacienNotifPanelOpen) {
      this.loadPharmacienNotifications();
    }
  }

  goToPharmacienOrder(orderId: number): void {
    this.pharmacienNotifPanelOpen = false;
    this.router.navigate(['/ph/orders'], { queryParams: { highlight: orderId } });
  }

  statusLabelFr(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Nouvelle commande',
      AWAITING_CLIENT_ACCEPTANCE: 'Attente client',
      AWAITING_PAYMENT: 'Attente paiement',
      ACCEPTED_FROM_PHARMACIEN: 'Acceptée',
      ACCEPTANCE_EXPIRED: 'Validation expirée',
      READY_FOR_DELIVERY: 'Prête',
      ASSIGNED: 'Livreur assigné',
      ASSIGNED_FROM_ADMIN: 'Assigné (admin)',
      ACCEPTED_FROM_LIVREUR: 'Livreur en route',
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
