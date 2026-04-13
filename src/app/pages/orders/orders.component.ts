import { Component } from '@angular/core';

export interface Order {
  id: string;
  client: string;
  phone: string;
  pharmacy: string;
  agent: string;
  items: number;
  total: string;
  status: string;
  date: string;
  address: string;
}

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent {
  searchTerm = '';
  statusFilter = 'all';
  selectedOrder: Order | null = null;

  allOrders: Order[] = [
    { id: '#ORD-9912', client: 'Amina Trabelsi',   phone: '+216 20 001 123', pharmacy: 'Pharmacie El Wafa',  agent: 'Karim Dali',    items: 3, total: '123 TND', status: 'delivered',  date: '12 Avr 2026 – 10:24', address: '14 Av. Habib Bourguiba, Tunis' },
    { id: '#ORD-9911', client: 'Yassine Chaabane',phone: '+216 25 002 456', pharmacy: 'SanteShop Tunis',    agent: 'Farid Moulai',  items: 5, total: '55 TND',  status: 'in_transit', date: '12 Avr 2026 – 09:45', address: '7 Rue de Marseille, Tunis'    },
    { id: '#ORD-9910', client: 'Sara Hammami',    phone: '+216 22 003 789', pharmacy: 'Pharmacie Centrale', agent: '—',             items: 2, total: '43 TND',  status: 'pending',    date: '12 Avr 2026 – 09:02', address: '32 Av. Farhat Hached, Sfax'   },
    { id: '#ORD-9909', client: 'Hamza Ben Salem', phone: '+216 50 004 321', pharmacy: 'Pharmacie El Wafa',  agent: 'Sofiane Rahem', items: 4, total: '162 TND', status: 'delivered',  date: '12 Avr 2026 – 08:30', address: '5 Rue Ibn Khaldoun, Tunis'    },
    { id: '#ORD-9908', client: 'Nadia Mansouri',  phone: '+216 55 005 654', pharmacy: 'Pharmanet Sfax',     agent: '—',             items: 1, total: '28 TND',  status: 'cancelled',  date: '11 Avr 2026 – 22:14', address: '9 Rue Pasteur, Sfax'          },
    { id: '#ORD-9907', client: 'Rami Boughanmi',  phone: '+216 27 006 987', pharmacy: 'SanteShop Tunis',    agent: 'Karim Dali',    items: 6, total: '89 TND',  status: 'confirmed',  date: '11 Avr 2026 – 20:50', address: '22 Cité El Khadra, Tunis'     },
    { id: '#ORD-9906', client: 'Fatma Khelifi',   phone: '+216 98 007 111', pharmacy: 'Al Amal Pharmacie',  agent: 'Ali Bouafia',   items: 2, total: '49 TND',  status: 'delivered',  date: '11 Avr 2026 – 19:10', address: '3 Av. de la République, Sousse' },
    { id: '#ORD-9905', client: 'Walid Jemai',     phone: '+216 26 008 222', pharmacy: 'Pharmacie El Wafa',  agent: 'Farid Moulai',  items: 7, total: '207 TND', status: 'delivered',  date: '11 Avr 2026 – 17:35', address: '18 Rue Ali Belhouane, Tunis'  },
    { id: '#ORD-9904', client: 'Rim Gharbi',      phone: '+216 29 009 333', pharmacy: 'Pharmacie Centrale', agent: '—',             items: 3, total: '63 TND',  status: 'pending',    date: '11 Avr 2026 – 14:22', address: '6 Rue 18 Janvier, Sfax'       },
    { id: '#ORD-9903', client: 'Tarek Jebali',    phone: '+216 23 010 444', pharmacy: 'SanteShop Tunis',    agent: 'Sofiane Rahem', items: 1, total: '18 TND',  status: 'delivered',  date: '11 Avr 2026 – 12:05', address: '11 Av. Mohamed V, Tunis'      },
  ];

  get filtered(): Order[] {
    return this.allOrders.filter(o => {
      const matchSearch = !this.searchTerm ||
        o.id.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        o.client.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        o.pharmacy.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchStatus = this.statusFilter === 'all' || o.status === this.statusFilter;
      return matchSearch && matchStatus;
    });
  }

  statusBadge(s: string) {
    const m: Record<string,string> = { delivered:'badge-success', in_transit:'badge-info', pending:'badge-warning', confirmed:'badge-primary', cancelled:'badge-danger' };
    return m[s] ?? 'badge-gray';
  }
  statusLabel(s: string) { return s.replace('_', ' '); }

  openDetail(o: Order) { this.selectedOrder = o; }
  closeDetail() { this.selectedOrder = null; }

  countByStatus(s: string) { return this.allOrders.filter(o => o.status === s).length; }
}
