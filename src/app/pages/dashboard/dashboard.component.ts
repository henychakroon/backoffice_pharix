import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  stats = [
    { label: 'Total Orders',      value: '3,842',  delta: '+12.4%', up: true,  icon: 'bag',    color: '#4f6ef7', bg: '#eef1ff' },
    { label: 'Active Clients',    value: '1,270',  delta: '+8.1%',  up: true,  icon: 'users',  color: '#2dce89', bg: '#e3faf1' },
    { label: 'Partner Pharmacies',value: '94',     delta: '+3',     up: true,  icon: 'pharma', color: '#00c9a7', bg: '#e0faf5' },
    { label: 'Delivery Agents',   value: '138',    delta: '-2',     up: false, icon: 'truck',  color: '#fb6340', bg: '#fff3ee' },
    { label: 'Revenue (TND)',     value: '215k',   delta: '+18.2%', up: true,  icon: 'money',  color: '#11cdef', bg: '#e3f9fd' },
    { label: 'Pending Orders',    value: '57',     delta: '-4.3%',  up: false, icon: 'clock',  color: '#f5365c', bg: '#fde8ed' },
  ];

  recentOrders = [
    { id: '#ORD-9912', client: 'Amina Trabelsi',   pharmacy: 'Pharmacie El Wafa',  agent: 'Karim D.',    total: '123 TND', status: 'delivered',   time: '12 min ago'  },
    { id: '#ORD-9911', client: 'Yassine Chaabane',pharmacy: 'SanteShop Tunis',    agent: 'Farid M.',    total: '55 TND',  status: 'in_transit',  time: '34 min ago'  },
    { id: '#ORD-9910', client: 'Sara Hammami',    pharmacy: 'Pharmacie Centrale', agent: '—',           total: '43 TND',  status: 'pending',     time: '1 hr ago'    },
    { id: '#ORD-9909', client: 'Hamza Ben Salem',  pharmacy: 'Pharmacie El Wafa',  agent: 'Sofiane R.',  total: '162 TND', status: 'delivered',   time: '2 hr ago'    },
    { id: '#ORD-9908', client: 'Nadia Mansouri',   pharmacy: 'Pharmanet Sfax',     agent: '—',           total: '28 TND',  status: 'cancelled',   time: '3 hr ago'    },
    { id: '#ORD-9907', client: 'Rami Boughanmi',   pharmacy: 'SanteShop Tunis',    agent: 'Karim D.',    total: '89 TND',  status: 'confirmed',   time: '4 hr ago'    },
  ];

  topPharmacies = [
    { name: 'Pharmacie El Wafa',   city: 'Tunis',    orders: 842, revenue: '41k TND', rating: 4.8 },
    { name: 'SanteShop Tunis',     city: 'Tunis',    orders: 710, revenue: '35k TND', rating: 4.7 },
    { name: 'Pharmanet Sfax',      city: 'Sfax',     orders: 603, revenue: '30k TND', rating: 4.6 },
    { name: 'Al Amal Pharmacie',   city: 'Sousse',   orders: 489, revenue: '24k TND', rating: 4.5 },
    { name: 'Pharmacie Centrale',  city: 'Monastir', orders: 376, revenue: '18k TND', rating: 4.4 },
  ];

  statusBadge(status: string) {
    const map: Record<string, string> = {
      delivered:  'badge-success',
      in_transit: 'badge-info',
      pending:    'badge-warning',
      confirmed:  'badge-primary',
      cancelled:  'badge-danger',
    };
    return map[status] ?? 'badge-gray';
  }

  statusLabel(status: string) {
    return status.replace('_', ' ');
  }

  stars(n: number): string[] {
    return Array(5).fill('').map((_, i) => i < Math.floor(n) ? 'full' : (i < n ? 'half' : 'empty'));
  }

  barWidth(orders: number): string {
    const max = 842;
    return Math.round((orders / max) * 100) + '%';
  }
}
