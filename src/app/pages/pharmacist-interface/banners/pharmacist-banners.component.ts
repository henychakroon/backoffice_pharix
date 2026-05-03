import { Component, OnInit } from '@angular/core';
import { PharmacienBanner, PharmacistService } from '../../../services/pharmacist.service';

type FeedbackType = 'success' | 'error';

@Component({
  selector: 'app-pharmacist-banners',
  templateUrl: './pharmacist-banners.component.html',
  styleUrls: ['./pharmacist-banners.component.scss']
})
export class PharmacistBannersComponent implements OnInit {
  banners: PharmacienBanner[] = [];
  loading = true;

  modalOpen = false;
  saving = false;
  title = '';
  description = '';
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  deletingId: number | null = null;
  confirmDeleteId: number | null = null;

  feedbackMessage = '';
  feedbackType: FeedbackType = 'success';

  constructor(private pharmacist: PharmacistService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.pharmacist.getMyBanners().subscribe({
      next: (list) => {
        this.banners = list;
        this.loading = false;
      },
      error: () => {
        this.banners = [];
        this.loading = false;
        this.showFeedback('Erreur lors du chargement des bannières.', 'error');
      }
    });
  }

  openModal(): void {
    this.title = '';
    this.description = '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.modalOpen = true;
  }

  closeModal(): void {
    if (this.saving) return;
    this.modalOpen = false;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
    if (!file) {
      this.imagePreview = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { this.imagePreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  canSubmit(): boolean {
    return !this.saving && this.title.trim().length > 0 && this.description.trim().length > 0;
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.saving = true;
    this.pharmacist
      .createBanner(this.title.trim(), this.description.trim(), this.selectedFile)
      .subscribe({
        next: (banner) => {
          this.banners = [banner, ...this.banners];
          this.saving = false;
          this.modalOpen = false;
          this.showFeedback('Bannière ajoutée, en attente de validation admin.', 'success');
        },
        error: () => {
          this.saving = false;
          this.showFeedback('Erreur lors de la création de la bannière.', 'error');
        }
      });
  }

  askDelete(id: number): void {
    this.confirmDeleteId = id;
  }

  cancelDelete(): void {
    this.confirmDeleteId = null;
  }

  confirmDelete(id: number): void {
    this.deletingId = id;
    this.confirmDeleteId = null;
    this.pharmacist.deleteBanner(id).subscribe({
      next: () => {
        this.banners = this.banners.filter(b => b.id !== id);
        this.deletingId = null;
        this.showFeedback('Bannière supprimée.', 'success');
      },
      error: () => {
        this.deletingId = null;
        this.showFeedback('Erreur lors de la suppression.', 'error');
      }
    });
  }

  statusLabel(b: PharmacienBanner): string {
    if (!b.validated) return 'En attente';
    return b.active ? 'Active' : 'Bloquée';
  }

  statusClass(b: PharmacienBanner): string {
    if (!b.validated) return 'badge-warning';
    return b.active ? 'badge-success' : 'badge-danger';
  }

  trackById(_: number, b: PharmacienBanner): number { return b.id; }

  private showFeedback(message: string, type: FeedbackType): void {
    this.feedbackMessage = message;
    this.feedbackType = type;
    setTimeout(() => {
      if (this.feedbackMessage === message) this.feedbackMessage = '';
    }, 4000);
  }
}
