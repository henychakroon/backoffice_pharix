import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, PharmacienProfile } from '../../services/admin.service';

@Component({
  selector: 'app-pharmacies',
  templateUrl: './pharmacies.component.html',
  styleUrls: ['./pharmacies.component.scss']
})
export class PharmaciesComponent implements OnInit {
  searchTerm = '';
  viewMode: 'table' | 'grid' = 'grid';
  activeTab: 'pharmacie' | 'parapharmacie' = 'pharmacie';
  pharmacies: PharmacienProfile[] = [];
  loading = true;
  selectedZone = '';
  selectedStatus = '';

  constructor(private admin: AdminService, private router: Router) {}

  ngOnInit(): void {
    this.admin.getPharmacies().subscribe({
      next: data => { this.pharmacies = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  viewOnMap(p: PharmacienProfile): void {
    this.router.navigate(['/zones'], {
      queryParams: {
        lat: p.latitude,
        lng: p.longitude,
        pharmacyName: p.pharmacyName
      }
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
    const typeKey = this.activeTab === 'pharmacie' ? 'PHARMACY' : 'PARAPHARMACIE';
    return this.pharmacies.filter(p => {
      const matchType = (p.pharmacyType ?? 'PHARMACY') === typeKey;
      const matchSearch = !this.searchTerm ||
        p.pharmacyName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.ownerName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.phone?.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchZone = !this.selectedZone ||
        (this.selectedZone === '__none__' ? !p.deliveryZoneName : p.deliveryZoneName === this.selectedZone);
      const matchStatus = !this.selectedStatus ||
        (this.selectedStatus === 'actif' ? p.active === true : p.active === false);
      return matchType && matchSearch && matchZone && matchStatus;
    });
  }

  get zoneOptions(): string[] {
    const zones = this.pharmacies
      .map(p => p.deliveryZoneName)
      .filter((z): z is string => !!z);
    return [...new Set(zones)].sort();
  }

  get pharmaciesCount(): number {
    return this.pharmacies.filter(p => (p.pharmacyType ?? 'PHARMACY') === 'PHARMACY').length;
  }

  get parapharmaciesCount(): number {
    return this.pharmacies.filter(p => p.pharmacyType === 'PARAPHARMACIE').length;
  }

  statusBadge(active: boolean): string {
    return active ? 'badge-success' : 'badge-danger';
  }

  statusLabel(active: boolean): string {
    return active ? 'Actif' : 'Bloqué';
  }
}

