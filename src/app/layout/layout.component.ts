import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { WebSocketService, AdminOrderEvent } from '../services/websocket.service';

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

  private wsSub?: Subscription;

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

  constructor(private router: Router, public auth: AuthService, private ws: WebSocketService) {
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
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.ws.disconnect();
  }

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

  toggle() { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleMobile() { this.mobileOpen = !this.mobileOpen; }
  logout() { this.auth.logout(); }

  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }
}
