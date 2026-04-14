import { Component, OnInit } from '@angular/core';
import { AdminService, ClientProfile } from '../../services/admin.service';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit {
  searchTerm = '';
  statusFilter = 'all';
  clients: ClientProfile[] = [];
  loading = true;

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.admin.getClients().subscribe({
      next: data => { this.clients = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get filtered(): ClientProfile[] {
    return this.clients.filter(c => {
      const matchSearch = !this.searchTerm ||
        c.fullName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        c.user?.email?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        c.user?.phone?.includes(this.searchTerm);
      return matchSearch;
    });
  }

  initials(name: string): string {
    return (name ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  avatarColors = ['#4f6ef7', '#2dce89', '#00c9a7', '#fb6340', '#f5365c', '#11cdef'];
  avatarBg(index: number): string {
    const colors = ['#eef1ff', '#e3faf1', '#e0faf5', '#fff3ee', '#fde8ed', '#e3f9fd'];
    return colors[index % colors.length];
  }
  avatarColor(index: number): string {
    return this.avatarColors[index % this.avatarColors.length];
  }
}

