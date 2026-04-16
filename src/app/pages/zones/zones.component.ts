import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DeliveryZoneService, DeliveryZone, ZoneCreateRequest, LivreurSummary, PharmacySummary } from '../../services/delivery-zone.service';

declare const google: any;

type ToastType = 'success' | 'error';
interface Toast { type: ToastType; message: string; }

@Component({
  selector: 'app-zones',
  templateUrl: './zones.component.html',
  styleUrls: ['./zones.component.scss']
})
export class ZonesComponent implements OnInit, OnDestroy {

  // ── State ──────────────────────────────────────────────────────────────────
  zones: DeliveryZone[] = [];
  loading = true;

  // ── Map ────────────────────────────────────────────────────────────────────
  private map: any = null;
  private drawingManager: any = null;
  private activePolygon: any = null;       // polygon currently being edited
  private renderedPolygons = new Map<number, any>(); // id → google.maps.Polygon
  isDrawing = false;
  drawingPoints: { lat: number; lng: number }[] = [];

  // ── Create/Edit form ───────────────────────────────────────────────────────
  showForm = false;
  editingZone: DeliveryZone | null = null;  // null = creating new
  formName = '';
  formSaving = false;

  // ── Delete confirm ─────────────────────────────────────────────────────────
  zoneToDelete: DeliveryZone | null = null;
  deleteLoading = false;

  // ── Livreur assignment modal ───────────────────────────────────────────────
  showAssignModal = false;
  assigningZone: DeliveryZone | null = null;
  assignModalTab: 'livreurs' | 'pharmacies' = 'livreurs';
  allLivreurs: LivreurSummary[] = [];
  livreursLoading = false;
  assigningId: number | null = null;    // livreurId currently being saved
  // Pharmacy tab
  zonePharmacies: PharmacySummary[] = [];
  pharmaciesLoading = false;
  syncingPharmacies = false;

  get assignedLivreurs(): LivreurSummary[] {
    return this.allLivreurs.filter(l => l.zoneId === this.assigningZone?.id);
  }
  get availableLivreurs(): LivreurSummary[] {
    return this.allLivreurs.filter(l => l.zoneId !== this.assigningZone?.id);
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  toast: Toast | null = null;
  private toastTimer: any;

  // ── Highlight from query param ───────────────────────────────────────────
  highlightedZoneId: number | null = null;
  private targetZoneId: number | null = null;

  // Tunisia center
  private readonly DEFAULT_CENTER = { lat: 33.8869, lng: 9.5375 };

  constructor(
    private zoneService: DeliveryZoneService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const id = params['zoneId'];
      if (id) { this.targetZoneId = +id; }
    });
    this.loadZones();
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  loadZones(): void {
    this.loading = true;
    this.zoneService.getAll().subscribe({
      next: res => {
        this.loading = false;
        if (res.success) {
          this.zones = res.data;
          this.renderAllPolygons();
          this.tryFlyToTarget();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.showToast('error', 'Impossible de charger les zones.');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Map init ───────────────────────────────────────────────────────────────

  private initMap(): void {
    const waitForGoogle = setInterval(() => {
      if (typeof google !== 'undefined') {
        clearInterval(waitForGoogle);
        this.buildMap();
      }
    }, 200);
  }

  private buildMap(): void {
    const el = document.getElementById('delivery-map');
    if (!el) return;

    this.map = new google.maps.Map(el, {
      center: this.DEFAULT_CENTER,
      zoom: 7,
      mapTypeId: 'roadmap',
      disableDefaultUI: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    this.drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: {
        fillColor: '#107bac',
        fillOpacity: 0.25,
        strokeColor: '#107bac',
        strokeWeight: 2,
        editable: true,
        draggable: false,
      },
    });

    this.drawingManager.setMap(this.map);

    google.maps.event.addListener(this.drawingManager, 'polygoncomplete', (polygon: any) => {
      this.onPolygonComplete(polygon);
    });

    this.renderAllPolygons();
    this.tryFlyToTarget();
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  startDrawing(): void {
    if (!this.drawingManager) return;
    this.clearActivePolygon();
    this.isDrawing = true;
    this.showForm = false;   // hide panel so full map is usable
    this.drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    this.cdr.detectChanges();
  }

  cancelDrawing(): void {
    if (this.drawingManager) this.drawingManager.setDrawingMode(null);
    this.isDrawing = false;
    this.clearActivePolygon();
    this.drawingPoints = [];
    this.showForm = true;    // restore panel
    this.cdr.detectChanges();
  }

  private onPolygonComplete(polygon: any): void {
    this.drawingManager.setDrawingMode(null);
    this.isDrawing = false;
    this.clearActivePolygon();
    this.activePolygon = polygon;
    const path = polygon.getPath();
    this.drawingPoints = [];
    for (let i = 0; i < path.getLength(); i++) {
      const ll = path.getAt(i);
      this.drawingPoints.push({ lat: ll.lat(), lng: ll.lng() });
    }
    // Re-show the form panel (was hidden during drawing)
    if (!this.editingZone && !this.formName) {
      // Brand-new zone — reset form fields
      this.editingZone = null;
      this.formName = '';
    }
    this.showForm = true;
    this.cdr.detectChanges();
  }

  private clearActivePolygon(): void {
    if (this.activePolygon) {
      this.activePolygon.setMap(null);
      this.activePolygon = null;
    }
  }

  // ── Polygon rendering ──────────────────────────────────────────────────────

  private renderAllPolygons(): void {
    if (!this.map) return;
    // Clear old
    this.renderedPolygons.forEach(p => p.setMap(null));
    this.renderedPolygons.clear();

    this.zones.forEach(zone => this.renderZonePolygon(zone));
  }

  private renderZonePolygon(zone: DeliveryZone): void {
    if (!this.map || !zone.points?.length) return;
    const path = zone.points
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(p => ({ lat: p.latitude, lng: p.longitude }));

    const polygon = new google.maps.Polygon({
      paths: path,
      fillColor: zone.active ? '#107bac' : '#9ca3af',
      fillOpacity: 0.2,
      strokeColor: zone.active ? '#107bac' : '#9ca3af',
      strokeWeight: 2,
    });
    polygon.setMap(this.map);

    // Info window on click
    const infoWindow = new google.maps.InfoWindow();
    google.maps.event.addListener(polygon, 'click', (event: any) => {
      infoWindow.setContent(`
        <div style="font-family:inherit;min-width:160px;padding:4px 2px">
          <div style="font-size:14px;font-weight:600;margin-bottom:6px">${zone.name}</div>
          <div style="margin-bottom:6px">${zone.active ? '✅ Active' : '⏸ Inactive'}</div>
          <div style="display:flex;gap:8px;font-size:12px;color:#555">
            <span>👤 ${zone.livreurCount ?? 0} livreur${(zone.livreurCount ?? 0) !== 1 ? 's' : ''}</span>
            <span>🏪 ${zone.pharmacyCount ?? 0} pharmacie${(zone.pharmacyCount ?? 0) !== 1 ? 's' : ''}</span>
          </div>
        </div>
      `);
      infoWindow.setPosition(event.latLng);
      infoWindow.open(this.map);
    });

    this.renderedPolygons.set(zone.id, polygon);
  }

  // ── Fly to zone ────────────────────────────────────────────────────────────

  onViewZone(zoneId: number): void {
    const zone = this.zones.find(z => z.id === zoneId);
    if (!zone) return;
    this.highlightedZoneId = zone.id;
    this.flyToZone(zone);
    const el = document.getElementById('zone-card-' + zone.id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { this.highlightedZoneId = null; this.cdr.detectChanges(); }, 3000);
  }

  private tryFlyToTarget(): void {
    if (!this.targetZoneId || !this.map || !this.zones.length) return;
    const zone = this.zones.find(z => z.id === this.targetZoneId);
    if (!zone) return;
    this.targetZoneId = null; // consume once
    this.highlightedZoneId = zone.id;
    this.flyToZone(zone);
    // Scroll the zone card into view
    setTimeout(() => {
      const el = document.getElementById('zone-card-' + zone.id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
    // Clear highlight after 3 s
    setTimeout(() => { this.highlightedZoneId = null; this.cdr.detectChanges(); }, 3000);
  }

  flyToZone(zone: DeliveryZone): void {
    if (!this.map || !zone.points?.length) return;
    const bounds = new google.maps.LatLngBounds();
    zone.points.forEach(p => bounds.extend({ lat: p.latitude, lng: p.longitude }));
    this.map.fitBounds(bounds, 60);
  }

  // ── Create form ────────────────────────────────────────────────────────────

  openCreateForm(): void {
    this.editingZone = null;
    this.formName = '';
    this.showForm = true;
    this.cdr.detectChanges();
  }

  openEditForm(zone: DeliveryZone): void {
    this.editingZone = zone;
    this.formName = zone.name;
    this.showForm = true;
    // Load existing polygon as editable
    this.clearActivePolygon();
    if (zone.points?.length) {
      const path = zone.points
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map(p => ({ lat: p.latitude, lng: p.longitude }));
      this.activePolygon = new google.maps.Polygon({
        paths: path,
        fillColor: '#f59e0b',
        fillOpacity: 0.25,
        strokeColor: '#f59e0b',
        strokeWeight: 2,
        editable: true,
        map: this.map,
      });
      this.drawingPoints = path;
      // Fit map to zone
      this.flyToZone(zone);
    }
    this.cdr.detectChanges();
  }

  closeForm(): void {
    this.showForm = false;
    this.editingZone = null;
    this.formName = '';
    this.drawingPoints = [];
    this.clearActivePolygon();
    this.isDrawing = false;
    if (this.drawingManager) this.drawingManager.setDrawingMode(null);
    this.cdr.detectChanges();
  }

  saveForm(): void {
    if (!this.formName.trim()) {
      this.showToast('error', 'Le nom est obligatoire.');
      return;
    }

    // If editing, polygon is optional (only replaces if redrawn)
    let points = this.drawingPoints;
    if (this.editingZone && points.length === 0) {
      // Keep existing points — pass them
      points = this.editingZone.points.map(p => ({ lat: p.latitude, lng: p.longitude }));
    }

    if (points.length < 3) {
      this.showToast('error', 'Dessinez un polygone avec au moins 3 points.');
      return;
    }

    // Sync points from editable polygon if present
    if (this.activePolygon) {
      const path = this.activePolygon.getPath();
      points = [];
      for (let i = 0; i < path.getLength(); i++) {
        const ll = path.getAt(i);
        points.push({ lat: ll.lat(), lng: ll.lng() });
      }
    }

    const dto: ZoneCreateRequest = {
      name: this.formName.trim(),
      points: points.map(p => ({ latitude: p.lat, longitude: p.lng })),
    };

    this.formSaving = true;
    if (this.editingZone) {
      this.zoneService.update(this.editingZone.id, dto).subscribe({
        next: res => this.handleSaveResponse(res, 'Zone mise à jour.'),
        error: err => this.handleSaveError(err),
      });
    } else {
      this.zoneService.create(dto).subscribe({
        next: res => this.handleSaveResponse(res, 'Zone créée avec succès.'),
        error: err => this.handleSaveError(err),
      });
    }
  }

  private handleSaveResponse(res: any, successMsg: string): void {
    this.formSaving = false;
    if (res.success) {
      this.showToast('success', successMsg);
      this.closeForm();
      this.loadZones();
    } else {
      this.showToast('error', res.error || 'Erreur.');
    }
    this.cdr.detectChanges();
  }

  private handleSaveError(err: any): void {
    this.formSaving = false;
    this.showToast('error', err.error?.error || err.message || 'Erreur serveur.');
    this.cdr.detectChanges();
  }

  // ── Toggle active ──────────────────────────────────────────────────────────

  toggleActive(zone: DeliveryZone): void {
    this.zoneService.toggleActive(zone.id, !zone.active).subscribe({
      next: res => {
        if (res.success) {
          zone.active = res.data.active;
          // Update rendered polygon color
          const poly = this.renderedPolygons.get(zone.id);
          if (poly) {
            const color = zone.active ? '#107bac' : '#9ca3af';
            poly.setOptions({ fillColor: color, strokeColor: color });
          }
          this.cdr.detectChanges();
        }
      },
      error: () => this.showToast('error', 'Impossible de modifier le statut.'),
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  confirmDelete(zone: DeliveryZone): void {
    this.zoneToDelete = zone;
  }

  executeDelete(): void {
    if (!this.zoneToDelete || this.deleteLoading) return;
    this.deleteLoading = true;
    this.zoneService.delete(this.zoneToDelete.id).subscribe({
      next: () => {
        this.deleteLoading = false;
        const deleted = this.zoneToDelete!;
        this.zoneToDelete = null;
        this.zones = this.zones.filter(z => z.id !== deleted.id);
        const poly = this.renderedPolygons.get(deleted.id);
        if (poly) { poly.setMap(null); this.renderedPolygons.delete(deleted.id); }
        this.showToast('success', `Zone "${deleted.name}" supprimée.`);
        this.cdr.detectChanges();
      },
      error: err => {
        this.deleteLoading = false;
        this.showToast('error', err.error?.error || 'Erreur lors de la suppression.');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Livreur assignment ─────────────────────────────────────────────────────

  openAssignModal(zone: DeliveryZone): void {
    this.assigningZone = zone;
    this.showAssignModal = true;
    this.assignModalTab = 'livreurs';
    this.loadLivreurs();
  }

  private loadLivreurs(): void {
    this.livreursLoading = true;
    this.zoneService.getAllLivreurs().subscribe({
      next: res => {
        this.livreursLoading = false;
        if (res.success) this.allLivreurs = res.data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.livreursLoading = false;
        this.showToast('error', 'Impossible de charger les livreurs.');
        this.cdr.detectChanges();
      }
    });
  }

  switchTab(tab: 'livreurs' | 'pharmacies'): void {
    this.assignModalTab = tab;
    if (tab === 'pharmacies' && this.zonePharmacies.length === 0 && !this.pharmaciesLoading) {
      this.loadPharmacies();
    }
  }

  private loadPharmacies(): void {
    if (!this.assigningZone) return;
    this.pharmaciesLoading = true;
    this.zoneService.getZonePharmacies(this.assigningZone.id).subscribe({
      next: res => {
        this.pharmaciesLoading = false;
        if (res.success) this.zonePharmacies = res.data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.pharmaciesLoading = false;
        this.showToast('error', 'Impossible de charger les pharmacies.');
        this.cdr.detectChanges();
      }
    });
  }

  syncPharmacies(): void {
    if (!this.assigningZone || this.syncingPharmacies) return;
    this.syncingPharmacies = true;
    this.zoneService.syncPharmacies(this.assigningZone.id).subscribe({
      next: res => {
        this.syncingPharmacies = false;
        if (res.success) {
          this.zonePharmacies = res.data;
          // Update count on the zone card
          const z = this.zones.find(z => z.id === this.assigningZone!.id);
          if (z) z.pharmacyCount = res.data.length;
          this.showToast('success', `${res.data.length} pharmacie(s) synchronisée(s).`);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.syncingPharmacies = false;
        this.showToast('error', 'Erreur lors de la synchronisation.');
        this.cdr.detectChanges();
      }
    });
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.assigningZone = null;
    this.allLivreurs = [];
    this.zonePharmacies = [];
    this.assigningId = null;
    this.assignModalTab = 'livreurs';
  }

  assign(livreur: LivreurSummary): void {
    if (!this.assigningZone || this.assigningId != null) return;
    this.assigningId = livreur.id;
    this.zoneService.assignLivreur(livreur.id, this.assigningZone.id).subscribe({
      next: res => {
        this.assigningId = null;
        if (res.success) {
          const idx = this.allLivreurs.findIndex(l => l.id === livreur.id);
          if (idx !== -1) this.allLivreurs[idx] = res.data;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.assigningId = null;
        this.showToast('error', 'Erreur lors de l\'affectation.');
        this.cdr.detectChanges();
      }
    });
  }

  unassign(livreur: LivreurSummary): void {
    if (this.assigningId != null) return;
    this.assigningId = livreur.id;
    this.zoneService.unassignLivreur(livreur.id).subscribe({
      next: res => {
        this.assigningId = null;
        if (res.success) {
          const idx = this.allLivreurs.findIndex(l => l.id === livreur.id);
          if (idx !== -1) this.allLivreurs[idx] = res.data;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.assigningId = null;
        this.showToast('error', 'Erreur lors du retrait.');
        this.cdr.detectChanges();
      }
    });
  }

  livreurDisplay(l: LivreurSummary): string {
    return l.email.split('@')[0];
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  showToast(type: ToastType, message: string): void {
    this.toast = { type, message };
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.detectChanges(); }, 5000);
  }
}
