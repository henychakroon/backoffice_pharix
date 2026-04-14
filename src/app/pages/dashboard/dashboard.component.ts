import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminService, Order, PharmacienProfile, ClientProfile } from '../../services/admin.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats = [
    { label: 'Total Orders',       value: '—', delta: '', up: true,  icon: 'bag',    color: '#4f6ef7', bg: '#eef1ff' },
    { label: 'Active Clients',     value: '—', delta: '', up: true,  icon: 'users',  color: '#2dce89', bg: '#e3faf1' },
    { label: 'Partner Pharmacies', value: '—', delta: '', up: true,  icon: 'pharma', color: '#00c9a7', bg: '#e0faf5' },
    { label: 'Pending Orders',     value: '—', delta: '', up: false, icon: 'clock',  color: '#f5365c', bg: '#fde8ed' },
  ];

  recentOrders: Order[] = [];
  topPharmacies: PharmacienProfile[] = [];
  loading = true;

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    forkJoin({
      orders:     this.admin.getOrders(),
      clients:    this.admin.getClients(),
      pharmacies: this.admin.getPharmacies(),
    }).subscribe({
      next: ({ orders, clients, pharmacies }) => {
        const pending  = orders.filter(o => o.status === 'PENDING').length;
        const activeC  = clients.length;
        const activeP  = pharmacies.filter(p => p.active).length;

        this.stats[0].value = String(orders.length);
        this.stats[1].value = String(activeC);
        this.stats[2].value = String(activeP);
        this.stats[3].value = String(pending);

        this.recentOrders  = orders.slice(-6).reverse();
        this.topPharmacies = pharmacies.filter(p => p.active).slice(0, 5);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      DELIVERED:  'badge-success',
      DELIVERING: 'badge-info',
      PICKED_UP:  'badge-info',
      PENDING:    'badge-warning',
      ACCEPTED:   'badge-primary',
      CANCELLED:  'badge-danger',
      REFUSED:    'badge-danger',
    };
    return map[status] ?? 'badge-gray';
  }

  statusLabel(status: string): string {
    return status.replace('_', ' ').toLowerCase();
  }

  stars(n: number): string[] {
    return Array(5).fill('').map((_, i) => i < Math.floor(n) ? 'full' : 'empty');
  }

  barWidth(orders: number): string {
    const max = Math.max(...this.topPharmacies.map(() => 1), 1);
    return Math.round((orders / max) * 100) + '%';
  }
}

