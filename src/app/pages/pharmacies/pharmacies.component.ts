import { Component } from '@angular/core';

@Component({
  selector: 'app-pharmacies',
  templateUrl: './pharmacies.component.html',
  styleUrls: ['./pharmacies.component.scss']
})
export class PharmaciesComponent {
  searchTerm = '';
  viewMode: 'table' | 'grid' = 'grid';

  pharmacies = [
    { id: 'PH-001', name: 'Pharmacie El Wafa',   owner: 'Dr. Khaled Trabelsi',  city: 'Tunis',    address: '14 Av. Habib Bourguiba, Tunis', phone: '+216 71 44 00 11', orders: 842, rating: 4.8, status: 'active',    verified: true,  joined: 'Sep 2024', revenue: '41 200 TND' },
    { id: 'PH-002', name: 'SanteShop Tunis',     owner: 'Dr. Sonia Ben Salah',  city: 'Tunis',    address: '7 Rue de Marseille, Tunis',     phone: '+216 71 55 02 33', orders: 710, rating: 4.7, status: 'active',    verified: true,  joined: 'Oct 2024', revenue: '34 800 TND' },
    { id: 'PH-003', name: 'Pharmacie Centrale',  owner: 'Dr. Youssef Hamdi',    city: 'Sfax',     address: '3 Av. Farhat Hached, Sfax',     phone: '+216 74 20 15 44', orders: 603, rating: 4.6, status: 'active',    verified: true,  joined: 'Nov 2024', revenue: '29 500 TND' },
    { id: 'PH-004', name: 'Pharmanet Sfax',       owner: 'Dr. Amira Jebali',     city: 'Sfax',     address: '22 Rue Ali Bach Hamba, Sfax',   phone: '+216 74 30 20 55', orders: 489, rating: 4.5, status: 'active',    verified: true,  joined: 'Dec 2024', revenue: '23 900 TND' },
    { id: 'PH-005', name: 'Al Amal Pharmacie',    owner: 'Dr. Nabil Chaabane',   city: 'Sousse',   address: '9 Av. de la République, Sousse',phone: '+216 73 60 10 77', orders: 376, rating: 4.4, status: 'active',    verified: false, joined: 'Jan 2025', revenue: '18 400 TND' },
    { id: 'PH-006', name: 'Pharmacie Nabeul',     owner: 'Dr. Leila Gharbi',     city: 'Nabeul',   address: '5 Rue Habib Thameur, Nabeul',  phone: '+216 72 71 50 88', orders: 124, rating: 3.9, status: 'pending',   verified: false, joined: 'Mar 2026', revenue: '—' },
    { id: 'PH-007', name: 'SantéPlus Bizerte',    owner: 'Dr. Slim Cherif',      city: 'Bizerte',  address: '17 Av. de la Corniche, Bizerte',phone: '+216 72 12 44 99', orders: 0,   rating: 0,   status: 'suspended', verified: false, joined: 'Feb 2026', revenue: '—' },
  ];

  get filtered() {
    return this.pharmacies.filter(p =>
      !this.searchTerm ||
      p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      p.city.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      p.owner.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  statusBadge(s: string) {
    const m: Record<string,string> = { active:'badge-success', pending:'badge-warning', suspended:'badge-danger' };
    return m[s] ?? 'badge-gray';
  }

  stars(n: number) {
    return Array(5).fill(0).map((_, i) => i < Math.floor(n) ? 'full' : 'empty');
  }
}
