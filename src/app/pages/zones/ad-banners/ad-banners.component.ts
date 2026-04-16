import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AdminService, AdvertisementBanner } from '../../../services/admin.service';

type FilterTab = 'all' | 'pending' | 'active' | 'blocked';

interface ZoneGroup {
  zoneId: number | null;
  zoneName: string;
  banners: AdvertisementBanner[];
}

@Component({
  selector: 'app-ad-banners',
  templateUrl: './ad-banners.component.html',
  styleUrls: ['./ad-banners.component.scss']
})
export class AdBannersComponent implements OnInit {
  @Output() viewZone = new EventEmitter<number>();

  banners: AdvertisementBanner[] = [];
  loading = true;
  activeTab: FilterTab = 'all';
  selectedZoneId: number | null | 'all' = 'all';
  actionLoading: number | null = null;
  confirmRejectId: number | null = null;

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.admin.getBanners().subscribe({
      next: (b) => { this.banners = b; this.loading = false; },
      error: ()  => { this.loading = false; }
    });
  }

  get filteredBanners(): AdvertisementBanner[] {
    let list = this.banners;
    switch (this.activeTab) {
      case 'pending': list = list.filter(b => !b.validated); break;
      case 'active':  list = list.filter(b => b.validated && b.active); break;
      case 'blocked': list = list.filter(b => b.validated && !b.active); break;
    }
    if (this.selectedZoneId !== 'all') {
      list = list.filter(b => b.zoneId === this.selectedZoneId);
    }
    return list;
  }

  get zoneGroups(): ZoneGroup[] {
    const map = new Map<number | null, ZoneGroup>();
    this.filteredBanners.forEach(b => {
      const key = b.zoneId ?? null;
      if (!map.has(key)) {
        map.set(key, { zoneId: key, zoneName: b.zoneName ?? 'No Zone', banners: [] });
      }
      map.get(key)!.banners.push(b);
    });
    return Array.from(map.values());
  }

  get uniqueZones(): { id: number | null; name: string }[] {
    const seen = new Set<number | null>();
    const zones: { id: number | null; name: string }[] = [];
    this.banners.forEach(b => {
      if (!seen.has(b.zoneId)) {
        seen.add(b.zoneId);
        zones.push({ id: b.zoneId, name: b.zoneName ?? 'No Zone' });
      }
    });
    return zones;
  }

  get pendingCount(): number { return this.banners.filter(b => !b.validated).length; }
  get activeCount(): number  { return this.banners.filter(b => b.validated && b.active).length; }
  get blockedCount(): number { return this.banners.filter(b => b.validated && !b.active).length; }

  statusLabel(b: AdvertisementBanner): string {
    if (!b.validated) return 'Pending';
    return b.active ? 'Active' : 'Blocked';
  }

  statusClass(b: AdvertisementBanner): string {
    if (!b.validated) return 'badge-warning';
    return b.active ? 'badge-success' : 'badge-danger';
  }

  imageUrl(b: AdvertisementBanner): string | null {
    return b.image ? `data:image/jpeg;base64,${b.image}` : null;
  }

  validate(banner: AdvertisementBanner): void {
    this.actionLoading = banner.id;
    this.admin.validateBanner(banner.id).subscribe({
      next: () => { banner.validated = true; banner.active = true; this.actionLoading = null; },
      error: ()  => { this.actionLoading = null; }
    });
  }

  toggle(banner: AdvertisementBanner): void {
    this.actionLoading = banner.id;
    this.admin.toggleBanner(banner.id).subscribe({
      next: () => { banner.active = !banner.active; this.actionLoading = null; },
      error: ()  => { this.actionLoading = null; }
    });
  }

  confirmReject(id: number): void { this.confirmRejectId = id; }
  cancelReject(): void { this.confirmRejectId = null; }

  reject(id: number): void {
    this.actionLoading = id;
    this.confirmRejectId = null;
    this.admin.rejectBanner(id).subscribe({
      next: () => { this.banners = this.banners.filter(b => b.id !== id); this.actionLoading = null; },
      error: ()  => { this.actionLoading = null; }
    });
  }

  setTab(tab: FilterTab): void {
    this.activeTab = tab;
    this.selectedZoneId = 'all';
  }

  onViewZone(zoneId: number | null): void {
    if (zoneId != null) this.viewZone.emit(zoneId);
  }
}
