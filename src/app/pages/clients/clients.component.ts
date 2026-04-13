import { Component } from '@angular/core';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent {
  searchTerm = '';
  statusFilter = 'all';

  clients = [
    { id: 'CLT-001', name: 'Amina Trabelsi',   email: 'amina.t@mail.tn',    phone: '+216 20 001 123', city: 'Tunis',    orders: 12, spent: '1 428 TND', status: 'active',    joined: 'Jan 2025' },
    { id: 'CLT-002', name: 'Yassine Chaabane',email: 'yassine.c@mail.tn',  phone: '+216 25 002 456', city: 'Tunis',    orders: 8,  spent: '745 TND',   status: 'active',    joined: 'Feb 2025' },
    { id: 'CLT-003', name: 'Sara Hammami',    email: 'sara.h@mail.tn',     phone: '+216 22 003 789', city: 'Sfax',     orders: 5,  spent: '461 TND',   status: 'active',    joined: 'Mar 2025' },
    { id: 'CLT-004', name: 'Hamza Ben Salem', email: 'hamza.bs@mail.tn',   phone: '+216 50 004 321', city: 'Tunis',    orders: 20, spent: '3 100 TND', status: 'active',    joined: 'Dec 2024' },
    { id: 'CLT-005', name: 'Nadia Mansouri',  email: 'nadia.m@mail.tn',    phone: '+216 55 005 654', city: 'Sfax',     orders: 3,  spent: '205 TND',   status: 'suspended', joined: 'Apr 2025' },
    { id: 'CLT-006', name: 'Rami Boughanmi',  email: 'rami.b@mail.tn',     phone: '+216 27 006 987', city: 'Tunis',    orders: 15, spent: '1 875 TND', status: 'active',    joined: 'Nov 2024' },
    { id: 'CLT-007', name: 'Fatma Khelifi',   email: 'fatma.k@mail.tn',    phone: '+216 98 007 111', city: 'Sousse',   orders: 7,  spent: '560 TND',   status: 'active',    joined: 'Jan 2026' },
    { id: 'CLT-008', name: 'Walid Jemai',     email: 'walid.j@mail.tn',    phone: '+216 26 008 222', city: 'Monastir', orders: 0,  spent: '0 TND',     status: 'inactive',  joined: 'Mar 2026' },
  ];

  get filtered() {
    return this.clients.filter(c => {
      const matchSearch = !this.searchTerm ||
        c.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        c.city.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchStatus = this.statusFilter === 'all' || c.status === this.statusFilter;
      return matchSearch && matchStatus;
    });
  }

  statusBadge(s: string) {
    const m: Record<string,string> = { active:'badge-success', suspended:'badge-danger', inactive:'badge-gray' };
    return m[s] ?? 'badge-gray';
  }

  initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  }

  avatarColors = ['#4f6ef7','#2dce89','#00c9a7','#fb6340','#f5365c','#11cdef'];
  avatarBg(index: number) {
    const colors = ['#eef1ff','#e3faf1','#e0faf5','#fff3ee','#fde8ed','#e3f9fd'];
    return colors[index % colors.length];
  }
  avatarColor(index: number) {
    return this.avatarColors[index % this.avatarColors.length];
  }
}
