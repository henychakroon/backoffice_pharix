import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import {
  CatalogService,
  ImportPreviewData,
  ImportConfirmData,
  MappingNeededData,
  MedicationDTO,
  MedicationUpdateRequest
} from '../../services/catalog.service';

type ToastType = 'success' | 'error';
interface Toast { type: ToastType; message: string; }

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class ProductsComponent implements OnInit, OnDestroy {

  // ── Tabs ────────────────────────────────────────────────────────────────────
  activeTab: 'import' | 'medications' = 'medications';

  // ── Import state ────────────────────────────────────────────────────────────
  importLoading = false;
  importPreview: ImportPreviewData | null = null;
  missingAmmsExpanded = false;
  confirmLoading = false;
  // ── Column mapping state (shown inline instead of a toast when cols mismatch) ─
  mappingData: MappingNeededData | null = null;
  columnMapping: Record<string, string> = {};
  mappingLoading = false;
  // ── Medications table state ─────────────────────────────────────────────────
  allMedications: MedicationDTO[] = [];
  filteredMedications: MedicationDTO[] = [];
  tableLoading = false;

  // Filter state
  searchTerm = '';
  selectedClasse = '';
  selectedSousClasse = '';
  selectedLaboratoire = '';
  selectedVeic = '';
  showInactive = false;   // when false, show only active

  // Dropdown option lists (extracted from loaded data)
  classes: string[] = [];
  sousClasses: string[] = [];
  laboratoires: string[] = [];
  veics: string[] = [];

  // Selection for export
  selectedAmms = new Set<string>();
  selectAll = false;

  // ── Detail drawer ───────────────────────────────────────────────────────────
  drawerOpen = false;
  drawerMedication: MedicationDTO | null = null;
  drawerIndicationsExpanded = false;  drawerEditMode = false;
  editDraft: MedicationUpdateRequest = {};
  editSaving = false;
  // ── Delete all confirm ──────────────────────────────────────────────────────
  showDeleteAllConfirm = false;
  deleteAllLoading = false;

  // ── Toast notifications ─────────────────────────────────────────────────────
  toast: Toast | null = null;
  private toastTimer: any;

  // ── Internal ────────────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  readonly ITEM_SIZE = 52; // virtual scroll row height in px

  constructor(
    private catalogService: CatalogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.applyFilters());

    this.loadMedications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ── Tab navigation ──────────────────────────────────────────────────────────

  setTab(tab: 'import' | 'medications'): void {
    this.activeTab = tab;
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    input.value = ''; // reset so same file can be reselected

    this.importPreview = null;
    this.mappingData = null;
    this.columnMapping = {};
    this.importLoading = true;

    this.catalogService.importCatalog(file).subscribe({
      next: res => {
        this.importLoading = false;
        if (res.success) {
          const step = res.data;
          if (step.step === 'MAPPING_NEEDED' && step.mapping) {
            this.mappingData = step.mapping;
            // Pre-fill column mapping with server suggestions
            this.columnMapping = { ...step.mapping.suggestedMapping };
          } else if (step.step === 'PREVIEW_READY' && step.preview) {
            this.importPreview = step.preview;
          }
        } else {
          this.showToast('error', res.error || 'Import failed.');
        }
        this.cdr.detectChanges();
      },
      error: err => {
        this.importLoading = false;
        const msg = err.error?.error || err.message || 'Server error during import.';
        this.showToast('error', msg);
        this.cdr.detectChanges();
      }
    });
  }

  cancelImport(): void {
    this.importPreview = null;
    this.mappingData = null;
    this.columnMapping = {};
  }

  get allRequiredMapped(): boolean {
    if (!this.mappingData) return false;
    return this.mappingData.expectedColumns.every(col => !!this.columnMapping[col]);
  }

  get mappedCount(): number {
    if (!this.mappingData) return 0;
    return this.mappingData.expectedColumns.filter(col => !!this.columnMapping[col]).length;
  }

  onRemapSubmit(): void {
    if (!this.mappingData || !this.allRequiredMapped) return;
    this.mappingLoading = true;

    this.catalogService.remapImport(this.mappingData.token, this.columnMapping).subscribe({
      next: res => {
        this.mappingLoading = false;
        if (res.success) {
          const step = res.data;
          if (step.step === 'PREVIEW_READY' && step.preview) {
            this.mappingData = null;
            this.columnMapping = {};
            this.importPreview = step.preview;
          } else {
            this.showToast('error', 'Unexpected response from server.');
          }
        } else {
          this.showToast('error', res.error || 'Remap failed.');
        }
        this.cdr.detectChanges();
      },
      error: err => {
        this.mappingLoading = false;
        const msg = err.error?.error || err.message || 'Server error during remap.';
        this.showToast('error', msg);
        this.cdr.detectChanges();
      }
    });
  }

  confirmImport(): void {
    if (!this.importPreview) return;
    this.confirmLoading = true;

    this.catalogService.confirmImport(this.importPreview.importToken).subscribe({
      next: res => {
        this.confirmLoading = false;
        this.importPreview = null;
        if (res.success) {
          const d = res.data;
          this.showToast('success',
            `Import confirmé — ${d.inserted} ajoutés, ${d.updated} mis à jour.`);
          this.loadMedications();
        } else {
          this.showToast('error', res.error || 'Confirm failed.');
        }
        this.cdr.detectChanges();
      },
      error: err => {
        this.confirmLoading = false;
        const msg = err.error?.error || err.message || 'Server error during confirm.';
        this.showToast('error', msg);
        this.cdr.detectChanges();
      }
    });
  }

  // ── Medications table ───────────────────────────────────────────────────────

  loadMedications(): void {
    this.tableLoading = true;
    this.selectedAmms.clear();
    this.selectAll = false;

    this.catalogService.getMedications({ size: 9999 }).subscribe({
      next: res => {
        this.tableLoading = false;
        if (res.success) {
          this.allMedications = res.data.content;
          this.buildFilterOptions();
          this.applyFilters();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.tableLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private buildFilterOptions(): void {
    const classes    = new Set<string>();
    const sousClasses = new Set<string>();
    const labs       = new Set<string>();
    const veics      = new Set<string>();

    for (const m of this.allMedications) {
      if (m.categoryName)    classes.add(m.categoryName);
      if (m.subCategoryName) sousClasses.add(m.subCategoryName);
      if (m.laboratoire)     labs.add(m.laboratoire);
      if (m.veic)            veics.add(m.veic);
    }

    this.classes      = Array.from(classes).sort();
    this.sousClasses  = Array.from(sousClasses).sort();
    this.laboratoires = Array.from(labs).sort();
    this.veics        = Array.from(veics).sort();
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredMedications = this.allMedications.filter(m => {
      if (term && !(
        (m.name  || '').toLowerCase().includes(term) ||
        (m.dci   || '').toLowerCase().includes(term)
      )) return false;

      if (this.selectedClasse      && m.categoryName    !== this.selectedClasse)      return false;
      if (this.selectedSousClasse  && m.subCategoryName !== this.selectedSousClasse)  return false;
      if (this.selectedLaboratoire && m.laboratoire     !== this.selectedLaboratoire) return false;
      if (this.selectedVeic        && m.veic            !== this.selectedVeic)        return false;
      if (!this.showInactive       && !m.isActive) return false;

      return true;
    });

    // Update select-all state
    if (this.filteredMedications.length === 0) {
      this.selectAll = false;
    } else {
      this.selectAll = this.filteredMedications.every(m => this.selectedAmms.has(m.amm));
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  onDropdownChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedClasse = '';
    this.selectedSousClasse = '';
    this.selectedLaboratoire = '';
    this.selectedVeic = '';
    this.showInactive = false;
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedClasse || this.selectedSousClasse
      || this.selectedLaboratoire || this.selectedVeic || this.showInactive);
  }

  // ── Row selection ────────────────────────────────────────────────────────────

  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.filteredMedications.forEach(m => this.selectedAmms.add(m.amm));
    } else {
      this.filteredMedications.forEach(m => this.selectedAmms.delete(m.amm));
    }
  }

  toggleRowSelection(amm: string, event: Event): void {
    event.stopPropagation();
    if (this.selectedAmms.has(amm)) {
      this.selectedAmms.delete(amm);
    } else {
      this.selectedAmms.add(amm);
    }
    this.selectAll = this.filteredMedications.length > 0
      && this.filteredMedications.every(m => this.selectedAmms.has(m.amm));
  }

  get selectedCount(): number {
    return this.selectedAmms.size;
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  exportSelected(): void {
    const amms = this.selectedCount > 0 ? Array.from(this.selectedAmms) : [];
    this.catalogService.exportCatalog(amms).subscribe({
      next: blob => {
        const url  = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'catalog-export.csv';
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.showToast('error', 'Échec de l\'export.')
    });
  }

  // ── Active toggle ────────────────────────────────────────────────────────────

  toggleActive(medication: MedicationDTO, event: Event): void {
    event.stopPropagation();
    const newActive = !medication.isActive;
    this.catalogService.toggleActive(medication.amm, newActive).subscribe({
      next: res => {
        if (res.success) {
          medication.isActive = newActive;
          this.applyFilters();
          this.cdr.detectChanges();
        }
      },
      error: () => this.showToast('error', 'Impossible de modifier le statut.')
    });
  }

  // ── Detail drawer ─────────────────────────────────────────────────────────────

  openDrawer(medication: MedicationDTO): void {
    this.drawerMedication = medication;
    this.drawerIndicationsExpanded = false;
    this.drawerEditMode = false;
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.drawerEditMode = false;
  }

  startEdit(): void {
    if (!this.drawerMedication) return;
    const m = this.drawerMedication;
    this.editDraft = {
      name: m.name || '',
      dci: m.dci || '',
      dosage: m.dosage || '',
      forme: m.forme || '',
      presentation: m.presentation || '',
      laboratoire: m.laboratoire || '',
      dateAmm: m.dateAmm || '',
      conditionnement: m.conditionnement || '',
      specification: m.specification || '',
      tableau: m.tableau || '',
      dureeConservation: m.dureeConservation || '',
      description: m.description || '',
      gpb: m.gpb || '',
      veic: m.veic || '',
      referencePrice: m.referencePrice
    };
    this.drawerEditMode = true;
  }

  cancelEdit(): void {
    this.drawerEditMode = false;
    this.editDraft = {};
  }

  saveEdit(): void {
    if (!this.drawerMedication || this.editSaving) return;
    this.editSaving = true;
    this.catalogService.updateMedication(this.drawerMedication.amm, this.editDraft).subscribe({
      next: res => {
        this.editSaving = false;
        if (res.success) {
          // Update in-memory arrays
          const updated = res.data;
          const idx = this.allMedications.findIndex(m => m.amm === updated.amm);
          if (idx !== -1) this.allMedications[idx] = updated;
          this.drawerMedication = updated;
          this.drawerEditMode = false;
          this.applyFilters();
          this.showToast('success', 'Médicament mis à jour.');
        } else {
          this.showToast('error', res.error || 'Mise à jour échouée.');
        }
        this.cdr.detectChanges();
      },
      error: err => {
        this.editSaving = false;
        const msg = err.error?.error || err.message || 'Erreur serveur.';
        this.showToast('error', msg);
        this.cdr.detectChanges();
      }
    });
  }

  // ── Delete all ────────────────────────────────────────────────────────────────

  executeDeleteAll(): void {
    if (this.deleteAllLoading) return;
    this.deleteAllLoading = true;
    this.catalogService.deleteAllMedications().subscribe({
      next: () => {
        this.deleteAllLoading = false;
        this.showDeleteAllConfirm = false;
        this.allMedications = [];
        this.filteredMedications = [];
        this.closeDrawer();
        this.showToast('success', 'Catalogue supprimé avec succès.');
        this.cdr.detectChanges();
      },
      error: err => {
        this.deleteAllLoading = false;
        const msg = err.error?.error || err.message || 'Erreur serveur.';
        this.showToast('error', msg);
        this.cdr.detectChanges();
      }
    });
  }

  // ── Toasts ────────────────────────────────────────────────────────────────────

  showToast(type: ToastType, message: string): void {
    this.toast = { type, message };
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = null;
      this.cdr.detectChanges();
    }, 5000);
  }

  dismissToast(): void {
    this.toast = null;
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  trackByAmm(_index: number, item: MedicationDTO): string {
    return item.amm;
  }
}

