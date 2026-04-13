import { Component } from '@angular/core';

interface BarData  { x: number; y: number; h: number; value: number; barW: number; }
interface LinePoint { x: number; y: number; value: number; }
interface DonutSeg  { label: string; value: number; color: string; strokeDasharray: string; strokeDashoffset: string; }

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent {

  selectedPeriod = 'year';

  kpis = [
    { label: 'Total Orders',    value: '3 842',  delta: '+12.4%', up: true,  icon: 'bag',   color: '#4f6ef7', bg: '#eef1ff', suffix: ''    },
    { label: 'Total Revenue',   value: '215 250',delta: '+18.2%', up: true,  icon: 'money', color: '#2dce89', bg: '#e3faf1', suffix: 'TND' },
    { label: 'Avg Order Value', value: '56.01',  delta: '+5.4%',  up: true,  icon: 'chart', color: '#00c9a7', bg: '#e0faf5', suffix: 'TND' },
    { label: 'Delivery Rate',   value: '93.8%',  delta: '+1.2%',  up: true,  icon: 'truck', color: '#fb6340', bg: '#fff3ee', suffix: ''    },
  ];

  months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  monthlyOrders  = [180, 220, 280, 310, 370, 420, 390, 450, 510, 480, 560, 620];
  monthlyRevenue = [8100, 9900, 12600, 13950, 16650, 18900, 17550, 20250, 22950, 21600, 25200, 27900];

  orderStatusData = [
    { label: 'Delivered',  value: 68, color: '#2dce89' },
    { label: 'In Transit', value: 15, color: '#11cdef' },
    { label: 'Pending',    value: 10, color: '#fb6340' },
    { label: 'Cancelled',  value: 7,  color: '#f5365c' },
  ];

  topPharmacies = [
    { name: 'Pharmacie El Wafa',   city: 'Tunis',    orders: 842, pct: 100, revenue: '41 200' },
    { name: 'SanteShop Tunis',     city: 'Tunis',    orders: 710, pct: 84,  revenue: '34 800' },
    { name: 'Pharmanet Sfax',      city: 'Sfax',     orders: 603, pct: 72,  revenue: '29 500' },
    { name: 'Al Amal Pharmacie',   city: 'Sousse',   orders: 489, pct: 58,  revenue: '23 900' },
    { name: 'Pharmacie Centrale',  city: 'Monastir', orders: 376, pct: 45,  revenue: '18 400' },
  ];

  /* ── Chart dimensions ─────────────────── */
  readonly PAD_L  = 44;
  readonly PAD_T  = 10;
  readonly CW     = 516;  // chart width
  readonly CH     = 160;  // chart height
  readonly VB_W = 44 + 516 + 8;   // 568
  readonly VB_H = 10 + 160 + 38;  // 208

  /* ── Pre-computed chart data ──────────── */
  barData:     BarData[]   = [];
  linePoints:  LinePoint[] = [];
  linePath  = '';
  areaPath  = '';
  donutSegs: DonutSeg[] = [];

  readonly donutR    = 58;
  readonly donutCirc = +(2 * Math.PI * 58).toFixed(2); // 364.42

  constructor() {
    this.buildBar();
    this.buildLine();
    this.buildDonut();
  }

  private buildBar() {
    const max   = Math.max(...this.monthlyOrders);
    const slotW = this.CW / this.monthlyOrders.length;
    const barW  = slotW - 8;
    this.barData = this.monthlyOrders.map((v, i) => ({
      x:    this.PAD_L + i * slotW + 4,
      y:    this.PAD_T + this.CH - Math.round((v / max) * this.CH),
      h:    Math.round((v / max) * this.CH),
      barW,
      value: v,
    }));
  }

  private buildLine() {
    const max = Math.max(...this.monthlyRevenue);
    const n   = this.monthlyRevenue.length;
    this.linePoints = this.monthlyRevenue.map((v, i) => ({
      x:     +(this.PAD_L + (i / (n - 1)) * this.CW).toFixed(1),
      y:     +(this.PAD_T + this.CH - (v / max) * this.CH).toFixed(1),
      value: v,
    }));

    // Smooth bezier path
    this.linePath = this.linePoints.map((pt, i) => {
      if (i === 0) return `M${pt.x},${pt.y}`;
      const prev = this.linePoints[i - 1];
      const cpx  = ((prev.x + pt.x) / 2).toFixed(1);
      return `C${cpx},${prev.y} ${cpx},${pt.y} ${pt.x},${pt.y}`;
    }).join(' ');

    const last  = this.linePoints[this.linePoints.length - 1];
    const first = this.linePoints[0];
    const botY  = this.PAD_T + this.CH;
    this.areaPath = `${this.linePath} L${last.x},${botY} L${first.x},${botY} Z`;
  }

  private buildDonut() {
    const circ = this.donutCirc;
    let cumLen = 0;
    this.donutSegs = this.orderStatusData.map(item => {
      const len       = +((item.value / 100) * circ).toFixed(2);
      const dashoffset = +(circ / 4 - cumLen).toFixed(2);
      cumLen += len;
      return { ...item, strokeDasharray: `${len} ${circ}`, strokeDashoffset: `${dashoffset}` };
    });
  }

  /* ── Y-axis helpers ───────────────────── */
  ordersYAxis  = this.yAxis(Math.max(...[180,220,280,310,370,420,390,450,510,480,560,620]), 5, v => `${v}`);
  revenueYAxis = this.yAxis(Math.max(...[8100,9900,12600,13950,16650,18900,17550,20250,22950,21600,25200,27900]), 5, v => `${Math.round(v/1000)}k`);

  private yAxis(max: number, ticks: number, fmt: (v: number) => string): { y: number; label: string }[] {
    return Array.from({ length: ticks }, (_, i) => {
      const pct = i / (ticks - 1);
      return {
        y:     +(this.PAD_T + this.CH * (1 - pct)).toFixed(1),
        label: fmt(Math.round(max * pct)),
      };
    });
  }

  /* ── Grid lines Y values ──────────────── */
  gridYs = Array.from({ length: 5 }, (_, i) => +(this.PAD_T + this.CH * (i / 4)).toFixed(1));
}

