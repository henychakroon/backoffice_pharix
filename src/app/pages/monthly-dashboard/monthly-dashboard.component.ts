import { Component, OnInit, ViewChild } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexResponsive,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ChartComponent,
} from 'ng-apexcharts';

import {
  AdminService,
  MonthlyDashboard,
} from '../../services/admin.service';

export type AreaChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  fill: ApexFill;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  grid: ApexGrid;
  colors: string[];
  markers: ApexMarkers;
};

export type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  grid: ApexGrid;
  colors: string[];
  fill: ApexFill;
  legend: ApexLegend;
  stroke: ApexStroke;
};

export type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  responsive: ApexResponsive[];
  stroke: ApexStroke;
  tooltip: ApexTooltip;
};

@Component({
  selector: 'app-monthly-dashboard',
  templateUrl: './monthly-dashboard.component.html',
  styleUrls: ['./monthly-dashboard.component.scss'],
})
export class MonthlyDashboardComponent implements OnInit {
  @ViewChild('revenueChart') revenueChart!: ChartComponent;
  @ViewChild('ordersChart') ordersChart!: ChartComponent;
  @ViewChild('weeklyChart') weeklyChart!: ChartComponent;
  @ViewChild('outcomeChart') outcomeChart!: ChartComponent;
  @ViewChild('statusChart') statusChart!: ChartComponent;
  @ViewChild('typeChart') typeChart!: ChartComponent;

  // Month picker (defaults to current month)
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth() + 1; // 1–12

  dashboard: MonthlyDashboard | null = null;
  loading = true;

  months = [
    { value: 1,  label: 'Janvier'   }, { value: 2,  label: 'Février'   },
    { value: 3,  label: 'Mars'      }, { value: 4,  label: 'Avril'     },
    { value: 5,  label: 'Mai'       }, { value: 6,  label: 'Juin'      },
    { value: 7,  label: 'Juillet'   }, { value: 8,  label: 'Août'      },
    { value: 9,  label: 'Septembre' }, { value: 10, label: 'Octobre'   },
    { value: 11, label: 'Novembre'  }, { value: 12, label: 'Décembre'  },
  ];

  years: number[] = [];

  stats: { label: string; value: string; icon: string; color: string; bg: string; growth?: number | null }[] = [
    { label: 'Commandes',          value: '—', icon: 'bag',    color: '#4f6ef7', bg: '#eef1ff' },
    { label: 'Livrées',            value: '—', icon: 'check',  color: '#2dce89', bg: '#e3faf1' },
    { label: 'Nouveaux clients',   value: '—', icon: 'users',  color: '#00c9a7', bg: '#e0faf5' },
    { label: 'Pharmacies actives', value: '—', icon: 'pharma', color: '#f5365c', bg: '#fde8ed' },
    { label: 'Revenu mensuel',     value: '—', icon: 'money',  color: '#fb6340', bg: '#fff3ee' },
    { label: 'Panier moyen',       value: '—', icon: 'avg',    color: '#11cdef', bg: '#e6f9ff' },
  ];

  // Chart options
  revenueChartOptions: Partial<AreaChartOptions> = {};
  ordersChartOptions: Partial<BarChartOptions> = {};
  weeklyChartOptions: Partial<BarChartOptions> = {};
  outcomeChartOptions: Partial<BarChartOptions> = {};
  statusChartOptions: Partial<DonutChartOptions> = {};
  typeChartOptions: Partial<DonutChartOptions> = {};

  constructor(private admin: AdminService) {
    const cur = new Date().getFullYear();
    for (let y = cur; y >= cur - 2; y--) this.years.push(y);
    this._initChartOptions();
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  onMonthChange(month: number): void { this.selectedMonth = month; this.loadDashboard(); }
  onYearChange(year: number): void   { this.selectedYear  = year;  this.loadDashboard(); }

  loadDashboard(): void {
    this.loading = true;
    this.admin.getMonthlyDashboard(this.selectedYear, this.selectedMonth).subscribe({
      next: (data) => {
        this.dashboard = data;
        this.loading = false;
        this._updateStats(data);
        this._updateCharts(data);
      },
      error: () => { this.loading = false; }
    });
  }

  private _updateStats(data: MonthlyDashboard): void {
    this.stats[0].value  = String(data.totalOrders);
    this.stats[0].growth = data.orderGrowthPct;
    this.stats[1].value  = String(data.deliveredOrders);
    this.stats[2].value  = String(data.newClients);
    this.stats[3].value  = String(data.activePharmacies);
    this.stats[4].value  = this.fmtRevenue(data.totalRevenue);
    this.stats[4].growth = data.revenueGrowthPct;
    this.stats[5].value  = this.fmtRevenue(data.averageOrderValue);
  }

  // ── Chart Initialization ─────────────────────────────────────────────────────

  private _initChartOptions(): void {
    // Revenue area chart (hero — daily revenue)
    this.revenueChartOptions = {
      series: [{ name: 'Revenu', data: [] }],
      chart: {
        type: 'area',
        height: 320,
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: 'inherit',
        animations: { enabled: true, speed: 600, easing: 'easeinout' },
      },
      colors: ['#4f6ef7'],
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.4,
          opacityFrom: 0.6,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      dataLabels: { enabled: false },
      markers: {
        size: 4,
        colors: ['#fff'],
        strokeColors: '#4f6ef7',
        strokeWidth: 2,
        hover: { size: 7 },
      },
      xaxis: {
        categories: [],
        labels: { style: { fontSize: '11px', colors: '#8898aa' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
      },
      yaxis: {
        labels: {
          style: { fontSize: '11px', colors: '#8898aa' },
          formatter: (v) => this.fmtRevenue(v),
        },
      },
      grid: {
        borderColor: '#f0f3f7',
        strokeDashArray: 4,
        padding: { left: 10, right: 10 },
      },
      tooltip: {
        theme: 'light',
        style: { fontSize: '12px' },
        x: { show: true },
        y: { formatter: (v) => this.fmtRevenue(v) },
      },
    };

    // Daily orders bar
    this.ordersChartOptions = {
      series: [{ name: 'Commandes', data: [] }],
      chart: {
        type: 'bar',
        height: 280,
        toolbar: { show: false },
        fontFamily: 'inherit',
      },
      colors: ['#5e72e4'],
      plotOptions: {
        bar: {
          borderRadius: 5,
          columnWidth: '60%',
          distributed: false,
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.25,
          opacityFrom: 1,
          opacityTo: 0.7,
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: false },
      xaxis: {
        categories: [],
        labels: { style: { fontSize: '11px', colors: '#8898aa' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { fontSize: '11px', colors: '#8898aa' } },
      },
      grid: { borderColor: '#f0f3f7', strokeDashArray: 4 },
      legend: { show: false },
      tooltip: {
        theme: 'light',
        y: { formatter: (v) => `${v} commandes` },
      },
    };

    // Weekly mixed (orders + revenue dual axis)
    this.weeklyChartOptions = {
      series: [
        { name: 'Commandes', type: 'column', data: [] },
        { name: 'Revenu',    type: 'column', data: [] },
      ],
      chart: {
        type: 'bar',
        height: 280,
        toolbar: { show: false },
        fontFamily: 'inherit',
      },
      colors: ['#5e72e4', '#2dce89'],
      plotOptions: {
        bar: { borderRadius: 5, columnWidth: '55%' },
      },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: {
        categories: [],
        labels: { style: { fontSize: '11px', colors: '#8898aa' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: [
        {
          seriesName: 'Commandes',
          labels: { style: { fontSize: '11px', colors: '#5e72e4' } },
          title: { text: 'Commandes', style: { fontSize: '11px', color: '#5e72e4' } },
        },
        {
          seriesName: 'Revenu',
          opposite: true,
          labels: {
            style: { fontSize: '11px', colors: '#2dce89' },
            formatter: (v) => this.fmtRevenue(v),
          },
          title: { text: 'Revenu', style: { fontSize: '11px', color: '#2dce89' } },
        },
      ],
      fill: { opacity: [0.9, 0.9] },
      grid: { borderColor: '#f0f3f7', strokeDashArray: 4 },
      legend: { position: 'top', fontSize: '12px' },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (v: number, opts: any) => {
            return opts.seriesIndex === 1 ? this.fmtRevenue(v) : `${v} commandes`;
          },
        },
      },
    };

    // Daily outcomes — stacked column (delivered vs cancelled)
    this.outcomeChartOptions = {
      series: [
        { name: 'Livrées',  data: [] },
        { name: 'Annulées', data: [] },
      ],
      chart: {
        type: 'bar',
        height: 280,
        stacked: true,
        toolbar: { show: false },
        fontFamily: 'inherit',
      },
      colors: ['#2dce89', '#f5365c'],
      plotOptions: {
        bar: { borderRadius: 4, columnWidth: '60%' },
      },
      dataLabels: { enabled: false },
      stroke: { show: false },
      xaxis: {
        categories: [],
        labels: { style: { fontSize: '11px', colors: '#8898aa' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { fontSize: '11px', colors: '#8898aa' } },
      },
      fill: { opacity: 0.95 },
      grid: { borderColor: '#f0f3f7', strokeDashArray: 4 },
      legend: { position: 'top', fontSize: '12px' },
      tooltip: { shared: true, intersect: false },
    };

    // Status distribution donut
    this.statusChartOptions = {
      series: [],
      chart: {
        type: 'donut',
        height: 320,
        fontFamily: 'inherit',
      },
      labels: [],
      colors: [],
      stroke: { width: 2, colors: ['#fff'] },
      dataLabels: { enabled: false },
      legend: {
        position: 'bottom',
        fontSize: '12px',
        markers: { offsetX: -4 } as any,
        itemMargin: { horizontal: 8, vertical: 4 },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              name: { show: true, fontSize: '13px', color: '#8898aa' },
              value: { show: true, fontSize: '20px', fontWeight: 700, color: '#32325d' },
              total: {
                show: true,
                label: 'Total',
                color: '#8898aa',
                fontSize: '13px',
                formatter: (w: any) =>
                  String(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)),
              },
            },
          },
        },
      },
      tooltip: {
        y: { formatter: (v: number) => `${v} commandes` },
      },
      responsive: [
        {
          breakpoint: 480,
          options: { chart: { height: 260 }, legend: { position: 'bottom' } },
        },
      ],
    };

    // Revenue by type donut
    this.typeChartOptions = {
      series: [],
      chart: {
        type: 'donut',
        height: 320,
        fontFamily: 'inherit',
      },
      labels: [],
      colors: ['#4f6ef7', '#fb6340'],
      stroke: { width: 2, colors: ['#fff'] },
      dataLabels: {
        enabled: true,
        style: { fontSize: '12px', fontWeight: 700 },
        formatter: (val: number) => Math.round(val) + '%',
        dropShadow: { enabled: false },
      },
      legend: {
        position: 'bottom',
        fontSize: '12px',
        itemMargin: { horizontal: 12, vertical: 4 },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              name: { show: true, fontSize: '13px', color: '#8898aa' },
              value: {
                show: true,
                fontSize: '18px',
                fontWeight: 700,
                color: '#32325d',
                formatter: (v: string) => this.fmtRevenue(Number(v)),
              },
              total: {
                show: true,
                label: 'Total',
                color: '#8898aa',
                fontSize: '13px',
                formatter: (w: any) => {
                  const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                  return this.fmtRevenue(total);
                },
              },
            },
          },
        },
      },
      tooltip: {
        y: { formatter: (v: number) => this.fmtRevenue(v) },
      },
      responsive: [
        {
          breakpoint: 480,
          options: { chart: { height: 260 }, legend: { position: 'bottom' } },
        },
      ],
    };
  }

  private _updateCharts(data: MonthlyDashboard): void {
    // Daily revenue (area)
    const dayLabels   = data.dailyStats.map((d) => d.dayLabel);
    const dailyRev    = data.dailyStats.map((d) => Number(d.revenue) || 0);
    const dailyOrders = data.dailyStats.map((d) => d.orderCount);

    if (this.revenueChart) {
      this.revenueChart.updateOptions({
        series: [{ name: 'Revenu', data: dailyRev }],
        xaxis: { categories: dayLabels },
      }, false, true);
    }

    if (this.ordersChart) {
      this.ordersChart.updateOptions({
        series: [{ name: 'Commandes', data: dailyOrders }],
        xaxis: { categories: dayLabels },
      }, false, true);
    }

    // Weekly mixed
    const weekLabels  = data.weeklyStats.map((w) => `S${w.weekNumber}`);
    const weekOrders  = data.weeklyStats.map((w) => w.orderCount);
    const weekRevenue = data.weeklyStats.map((w) => Number(w.revenue) || 0);

    if (this.weeklyChart) {
      this.weeklyChart.updateOptions({
        series: [
          { name: 'Commandes', data: weekOrders },
          { name: 'Revenu',    data: weekRevenue },
        ],
        xaxis: { categories: weekLabels },
      }, false, true);
    }

    // Outcomes stacked
    const outcomeLabels = data.dailyOutcomes.map((d) => d.dayLabel);
    const delivered     = data.dailyOutcomes.map((d) => d.delivered);
    const cancelled     = data.dailyOutcomes.map((d) => d.cancelled);

    if (this.outcomeChart) {
      this.outcomeChart.updateOptions({
        series: [
          { name: 'Livrées',  data: delivered },
          { name: 'Annulées', data: cancelled },
        ],
        xaxis: { categories: outcomeLabels },
      }, false, true);
    }

    // Status donut
    const statusLabels = data.statusDistribution.map((s) => this.statusLabel(s.status));
    const statusData   = data.statusDistribution.map((s) => s.count);
    const statusColors = data.statusDistribution.map((s) => this.statusColorHex(s.status));

    if (this.statusChart) {
      this.statusChart.updateOptions({
        series: statusData,
        labels: statusLabels,
        colors: statusColors,
      }, false, true);
    }

    // Revenue by type donut
    const typeLabels = data.revenueByType.map((t) =>
      t.type === 'MEDICAMENT' || t.type === 'PHARMACY' ? 'Médicaments' : 'Parapharmacie'
    );
    const typeData = data.revenueByType.map((t) => Number(t.revenue) || 0);

    if (this.typeChart) {
      this.typeChart.updateOptions({
        series: typeData,
        labels: typeLabels,
      }, false, true);
    }
  }

  // ── Status helpers ───────────────────────────────────────────────────────────

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      DELIVERED: 'Livrées', DELIVERING: 'En livraison', PICKED_UP: 'Récupérées',
      PENDING: 'En attente', CANCELLED: 'Annulées',
      REFUSED_FROM_PHARMACIEN: 'Refusées (pharma)', REFUSED_FROM_LIVREUR: 'Refusées (livreur)',
      DISPATCH_FAILED: 'Dispatch échoué', ACCEPTED_FROM_PHARMACIEN: 'Acceptées',
      ACCEPTED_FROM_LIVREUR: 'Livreur en route', ASSIGNED: 'Assignées',
      ASSIGNED_FROM_ADMIN: 'Assignées (admin)', READY_FOR_DELIVERY: 'Prêtes',
    };
    return map[status] ?? status;
  }

  statusColorHex(status: string): string {
    const map: Record<string, string> = {
      DELIVERED: '#2dce89',
      DELIVERING: '#11cdef',
      PICKED_UP: '#5e72e4',
      PENDING: '#fb6340',
      CANCELLED: '#f5365c',
      REFUSED_FROM_PHARMACIEN: '#f5365c',
      REFUSED_FROM_LIVREUR: '#f5365c',
      DISPATCH_FAILED: '#adb5bd',
      ACCEPTED_FROM_PHARMACIEN: '#4f6ef7',
      ACCEPTED_FROM_LIVREUR: '#11cdef',
      ASSIGNED: '#4f6ef7',
      ASSIGNED_FROM_ADMIN: '#4f6ef7',
      READY_FOR_DELIVERY: '#2dce89',
    };
    return map[status] ?? '#adb5bd';
  }

  // ── Misc ─────────────────────────────────────────────────────────────────────

  fmtRevenue(v: number | string | null | undefined): string {
    const n = Number(v);
    if (!n || isNaN(n)) return '0 TND';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K TND';
    return n.toFixed(0) + ' TND';
  }

  growthIcon(pct: number | null | undefined): string {
    if (pct == null) return '';
    return pct >= 0 ? '↑' : '↓';
  }

  growthClass(pct: number | null | undefined): string {
    if (pct == null) return '';
    return pct >= 0 ? 'growth-up' : 'growth-down';
  }
}
