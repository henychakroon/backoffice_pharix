import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  sidebarCollapsed = false;
  mobileOpen = false;
  currentRoute = '';

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

  constructor(private router: Router, private auth: AuthService) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentRoute = e.urlAfterRedirects;
        this.mobileOpen = false;
      });
  }

  toggle() { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleMobile() { this.mobileOpen = !this.mobileOpen; }
  logout() { this.auth.logout(); }

  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }
}
