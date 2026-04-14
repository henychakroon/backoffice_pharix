import { Component, OnInit } from '@angular/core';
import { AdminService, PharmacienProfile } from '../../services/admin.service';

@Component({
  selector: 'app-pharmacies',
  templateUrl: './pharmacies.component.html',
  styleUrls: ['./pharmacies.component.scss']
})
export class PharmaciesComponent implements OnInit {
  searchTerm = '';
  viewMode: 'table' | 'grid' = 'grid';
  pharmacies: PharmacienProfile[] = [];
  loading = true;

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.admin.getPharmacies().subscribe({
      next: data => { this.pharmacies = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  activate(id: number): void {
    this.admin.activatePharmacy(id).subscribe(updated => {
      const p = this.pharmacies.find(x => x.id === id);
      if (p) p.active = updated.active;
    });
  }

  block(id: number): void {
    this.admin.blockPharmacy(id).subscribe(updated => {
      const p = this.pharmacies.find(x => x.id === id);
      if (p) { p.active = updated.active; p.online = updated.online; }
    });
  }

  get filtered(): PharmacienProfile[] {
    return this.pharmacies.filter(p =>
      !this.searchTerm ||
      p.pharmacyName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      p.ownerName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      p.user?.email?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  statusBadge(active: boolean): string {
    return active ? 'badge-success' : 'badge-danger';
  }

  statusLabel(active: boolean): string {
    return active ? 'Active' : 'Blocked';
  }
}

