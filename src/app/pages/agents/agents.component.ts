import { Component } from '@angular/core';

@Component({
  selector: 'app-agents',
  templateUrl: './agents.component.html',
  styleUrls: ['./agents.component.scss']
})
export class AgentsComponent {
  searchTerm = '';

  agents = [
    { id: 'AGT-001', name: 'Karim Dridi',      phone: '+216 20 100 201', city: 'Tunis',    deliveries: 312, rating: 4.9, onTime: '97%', status: 'available',   activeOrder: '#ORD-9911', vehicle: 'Moto',    joined: 'Sep 2024' },
    { id: 'AGT-002', name: 'Farid Moulahi',   phone: '+216 25 100 202', city: 'Tunis',    deliveries: 289, rating: 4.8, onTime: '96%', status: 'on_delivery', activeOrder: '#ORD-9912', vehicle: 'Scooter', joined: 'Oct 2024' },
    { id: 'AGT-003', name: 'Sofiane Rahimi',  phone: '+216 22 100 203', city: 'Sfax',     deliveries: 245, rating: 4.7, onTime: '94%', status: 'available',   activeOrder: null,        vehicle: 'Moto',    joined: 'Nov 2024' },
    { id: 'AGT-004', name: 'Ali Bouaziz',     phone: '+216 50 100 204', city: 'Sousse',   deliveries: 198, rating: 4.6, onTime: '93%', status: 'on_delivery', activeOrder: '#ORD-9906', vehicle: 'Vélo',    joined: 'Jan 2025' },
    { id: 'AGT-005', name: 'Mehdi Chaouachi', phone: '+216 55 100 205', city: 'Tunis',    deliveries: 176, rating: 4.5, onTime: '91%', status: 'offline',     activeOrder: null,        vehicle: 'Moto',    joined: 'Feb 2025' },
    { id: 'AGT-006', name: 'Zied Hamdi',      phone: '+216 27 100 206', city: 'Tunis',    deliveries: 143, rating: 4.3, onTime: '89%', status: 'available',   activeOrder: null,        vehicle: 'Scooter', joined: 'Mar 2025' },
    { id: 'AGT-007', name: 'Nabil Gharbi',    phone: '+216 98 100 207', city: 'Monastir', deliveries: 98,  rating: 4.2, onTime: '88%', status: 'suspended',   activeOrder: null,        vehicle: 'Moto',    joined: 'Apr 2025' },
  ];

  get filtered() {
    return this.agents.filter(a =>
      !this.searchTerm ||
      a.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      a.city.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  statusBadge(s: string) {
    const m: Record<string,string> = { available:'badge-success', on_delivery:'badge-info', offline:'badge-gray', suspended:'badge-danger' };
    return m[s] ?? 'badge-gray';
  }
  statusLabel(s: string) {
    const l: Record<string,string> = { available:'Available', on_delivery:'On Delivery', offline:'Offline', suspended:'Suspended' };
    return l[s] ?? s;
  }

  initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  }

  countByStatus(s: string) { return this.agents.filter(a => a.status === s).length; }
}
