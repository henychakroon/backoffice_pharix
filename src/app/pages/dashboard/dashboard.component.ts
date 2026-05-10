import { Component, OnInit } from '@angular/core';
import { AdminService, AdminDashboard } from '../../services/admin.service';
import { getOrderStatusBadge, getOrderStatusLabel } from '../../shared/order-status';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  selectedDate: string = new Date().toISOString().split('T')[0];

 


stats = [
  { label: 'Total Orders',       value: '—', icon: 'bag',    color: '#4f6ef7', bg: '#eef1ff' },
  { label: 'Active Clients',     value: '—', icon: 'users',  color: '#2dce89', bg: '#e3faf1' },
  { label: 'Partner Pharmacies', value: '—', icon: 'pharma', color: '#00c9a7', bg: '#e0faf5' },
  { label: 'Pending Orders',     value: '—', icon: 'clock',  color: '#f5365c', bg: '#fde8ed' },
  { label: 'Daily Revenue',      value: '—', icon: 'money',  color: '#fb6340', bg: '#fff3ee' },
  { label: 'Monthly Revenue',    value: '—', icon: 'money',  color: '#11cdef', bg: '#e6f9ff' },
];
  dashboard: AdminDashboard | null = null;
  loading = true;

  chartMaxOrders = 1;
  chartMaxRevenue = 1;

  // SVG chart constants
  readonly CHART_W = 560;
  readonly CHART_H = 100;
  readonly BAR_SLOT = 80;
  readonly BAR_W    = 50;

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  onDateChange(event: Event): void {
    this.selectedDate = (event.target as HTMLInputElement).value;
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.admin.getDashboard(this.selectedDate).subscribe({
      next: (data) => {
        this.dashboard = data;
        this.loading = false;

        this.stats[0].value = String(data.totalOrders);
        this.stats[1].value = String(data.totalClients);
        this.stats[2].value = String(data.activePharmacies);
        this.stats[3].value = String(data.pendingOrders);
        this.stats[4].value = this.fmtRevenue(data.totalRevenue);
this.stats[5].value = this.fmtRevenue(data.monthlyRevenue);

        this.chartMaxOrders  = Math.max(...data.ordersByDay.map(d => d.orderCount), 1);
        this.chartMaxRevenue = Math.max(...data.ordersByDay.map(d => Number(d.revenue) || 0), 1);
      },
      error: () => { this.loading = false; }
    });
  }

  // Status breakdown percentages
  statusPct(count: number): number {
    const total = this.dashboard?.totalOrders ?? 0;
    return total ? Math.round((count / total) * 100) : 0;
  }

  // Bar chart helpers
  barH(count: number): number {
    return Math.round((count / this.chartMaxOrders) * this.CHART_H);
  }

  barX(i: number): number { return i * this.BAR_SLOT + (this.BAR_SLOT - this.BAR_W) / 2; }
  barY(count: number): number { return this.CHART_H - this.barH(count); }
  labelX(i: number): number { return i * this.BAR_SLOT + this.BAR_SLOT / 2; }

  // Line chart helpers
  revY(rev: number): number {
    return this.CHART_H - Math.round((Number(rev) / this.chartMaxRevenue) * (this.CHART_H - 10)) + 5;
  }

  get revenueLinePoints(): string {
    return (this.dashboard?.ordersByDay ?? [])
      .map((d, i) => `${this.labelX(i)},${this.revY(d.revenue)}`)
      .join(' ');
  }

  get revenueAreaPoints(): string {
    const days = this.dashboard?.ordersByDay ?? [];
    if (!days.length) return '';
    const line = days.map((d, i) => `${this.labelX(i)},${this.revY(d.revenue)}`).join(' ');
    const lastX = this.labelX(days.length - 1);
    const firstX = this.labelX(0);
    return `${firstX},${this.CHART_H + 10} ${line} ${lastX},${this.CHART_H + 10}`;
  }

  fmtRevenue(v: number): string {
    if (!v) return '0 TND';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K TND';
    return Number(v).toFixed(0) + ' TND';
  }

  statusBadge(status: string): string {
    return getOrderStatusBadge(status);
  }

  statusLabel(status: string): string {
    return getOrderStatusLabel(status);
  }
}
