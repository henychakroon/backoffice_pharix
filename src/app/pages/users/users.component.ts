import { Component, OnInit } from '@angular/core';
import { AdminService, AdminUser } from '../../services/admin.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: AdminUser[] = [];
  loading = true;
  actionLoadingId: number | null = null;

  searchTerm = '';
  roleFilter = 'all';
  banFilter = 'all';

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.admin.getUsers().subscribe({
      next: data => {
        this.users = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get filtered(): AdminUser[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.users.filter(user => {
      const matchesSearch = !term || [
        user.displayName,
        user.email,
        user.phone,
        user.role,
        user.pharmacyName,
        user.ownerName,
        user.clientFullName,
        user.vehicleType,
        user.deliveryZoneName
      ].some(value => (value ?? '').toLowerCase().includes(term));

      const matchesRole = this.roleFilter === 'all' || user.role === this.roleFilter;
      const matchesBan = this.banFilter === 'all'
        || (this.banFilter === 'banned' && user.banned)
        || (this.banFilter === 'active' && !user.banned);

      return matchesSearch && matchesRole && matchesBan;
    });
  }

  get bannedCount(): number {
    return this.users.filter(user => user.banned).length;
  }

  get roleCounts(): Record<string, number> {
    return this.users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  initials(user: AdminUser): string {
    const name = user.displayName || user.email || '?';
    return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
  }

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      ADMIN: 'Admin',
      CLIENT: 'Client',
      PHARMACIEN: 'Pharmacien',
      LIVREUR: 'Livreur'
    };
    return labels[role] ?? role;
  }

  roleBadge(role: string): string {
    const badges: Record<string, string> = {
      ADMIN: 'badge-primary',
      CLIENT: 'badge-info',
      PHARMACIEN: 'badge-success',
      LIVREUR: 'badge-accent'
    };
    return badges[role] ?? 'badge-gray';
  }

  userMeta(user: AdminUser): string {
    if (user.role === 'PHARMACIEN') {
      return [user.pharmacyName, user.pharmacyType, user.deliveryZoneName].filter(Boolean).join(' · ');
    }
    if (user.role === 'CLIENT') {
      return [user.clientFullName, this.coordsLabel(user)].filter(Boolean).join(' · ');
    }
    if (user.role === 'LIVREUR') {
      return [user.livreurType, user.vehicleType, user.deliveryZoneName].filter(Boolean).join(' · ');
    }
    return 'Compte administrateur';
  }

  coordsLabel(user: AdminUser): string {
    if (user.latitude == null || user.longitude == null) {
      return '';
    }
    return `${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}`;
  }

  ban(user: AdminUser): void {
    this.actionLoadingId = user.id;
    this.admin.banUser(user.id).subscribe({
      next: updated => {
        this.replaceUser(updated);
        this.actionLoadingId = null;
      },
      error: () => {
        this.actionLoadingId = null;
      }
    });
  }

  unban(user: AdminUser): void {
    this.actionLoadingId = user.id;
    this.admin.unbanUser(user.id).subscribe({
      next: updated => {
        this.replaceUser(updated);
        this.actionLoadingId = null;
      },
      error: () => {
        this.actionLoadingId = null;
      }
    });
  }

  private replaceUser(updated: AdminUser): void {
    const index = this.users.findIndex(user => user.id === updated.id);
    if (index !== -1) {
      this.users[index] = updated;
      this.users = [...this.users];
    }
  }
}
