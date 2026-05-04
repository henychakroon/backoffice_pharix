import { Component, OnInit } from '@angular/core';
import {
  Coupon,
  CouponScope,
  CouponScopeOptions,
  CouponType,
  CouponUpsert,
  PharmacistService,
} from '../../../services/pharmacist.service';

type FeedbackType = 'success' | 'error';

interface FormState {
  id: number | null;
  code: string;
  type: CouponType;
  value: number | null;
  scope: CouponScope;
  productIds: number[];
  categoryIds: number[];
  minSubtotal: number | null;
  maxDiscount: number | null;
  validFrom: string;
  validTo: string;
  maxRedemptions: number | null;
  maxRedemptionsPerClient: number | null;
  active: boolean;
}

@Component({
  selector: 'app-pharmacist-coupons',
  templateUrl: './pharmacist-coupons.component.html',
  styleUrls: ['./pharmacist-coupons.component.scss'],
})
export class PharmacistCouponsComponent implements OnInit {
  coupons: Coupon[] = [];
  options: CouponScopeOptions = { products: [], categories: [] };

  loading = true;
  saving = false;
  modalOpen = false;
  togglingId: number | null = null;
  deletingId: number | null = null;
  pendingDelete: Coupon | null = null;

  productSearch = '';
  categorySearch = '';

  feedbackMessage = '';
  feedbackType: FeedbackType = 'success';

  form: FormState = this.emptyForm();

  constructor(private pharmacist: PharmacistService) {}

  ngOnInit(): void {
    this.load();
    this.pharmacist.getCouponScopeOptions().subscribe({
      next: (opts) => (this.options = opts),
      error: () => (this.options = { products: [], categories: [] }),
    });
  }

  load(): void {
    this.loading = true;
    this.pharmacist.listCoupons().subscribe({
      next: (list) => {
        this.coupons = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.flash('error', 'Erreur lors du chargement des coupons');
      },
    });
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.modalOpen = true;
  }

  openEdit(c: Coupon): void {
    this.form = {
      id: c.id,
      code: c.code,
      type: c.type,
      value: c.value,
      scope: c.scope,
      productIds: (c.products ?? []).map((p) => p.id),
      categoryIds: (c.categories ?? []).map((cat) => cat.id),
      minSubtotal: c.minSubtotal ?? null,
      maxDiscount: c.maxDiscount ?? null,
      validFrom: this.toLocalInput(c.validFrom),
      validTo: this.toLocalInput(c.validTo),
      maxRedemptions: c.maxRedemptions ?? null,
      maxRedemptionsPerClient: c.maxRedemptionsPerClient ?? 1,
      active: c.active,
    };
    this.modalOpen = true;
  }

  closeModal(): void {
    if (this.saving) return;
    this.modalOpen = false;
  }

  save(): void {
    if (!this.validate()) return;
    const payload: CouponUpsert = {
      code: this.form.code.trim().toUpperCase(),
      type: this.form.type,
      value: this.form.value as number,
      scope: this.form.scope,
      productIds: this.form.scope === 'PRODUCT' ? this.form.productIds : [],
      categoryIds: this.form.scope === 'CATEGORY' ? this.form.categoryIds : [],
      minSubtotal: this.form.minSubtotal ?? null,
      maxDiscount: this.form.maxDiscount ?? null,
      validFrom: this.fromLocalInput(this.form.validFrom),
      validTo: this.fromLocalInput(this.form.validTo),
      maxRedemptions: this.form.maxRedemptions ?? null,
      maxRedemptionsPerClient: this.form.maxRedemptionsPerClient ?? 1,
      active: this.form.active,
    };

    this.saving = true;
    const obs = this.form.id
      ? this.pharmacist.updateCoupon(this.form.id, payload)
      : this.pharmacist.createCoupon(payload);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.modalOpen = false;
        this.flash('success', this.form.id ? 'Coupon mis à jour' : 'Coupon créé');
        this.load();
      },
      error: (err) => {
        this.saving = false;
        const reason = err?.error?.error || err?.error?.message || err?.error || 'Échec de l\'enregistrement';
        this.flash('error', typeof reason === 'string' ? reason : 'Échec de l\'enregistrement');
      },
    });
  }

  toggle(c: Coupon): void {
    this.togglingId = c.id;
    this.pharmacist.toggleCoupon(c.id).subscribe({
      next: (updated) => {
        this.togglingId = null;
        const idx = this.coupons.findIndex((x) => x.id === updated.id);
        if (idx !== -1) this.coupons[idx] = updated;
      },
      error: () => {
        this.togglingId = null;
        this.flash('error', 'Erreur lors du changement de statut');
      },
    });
  }

  askDelete(c: Coupon): void {
    this.pendingDelete = c;
  }

  cancelDelete(): void {
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const c = this.pendingDelete;
    if (!c) return;
    this.deletingId = c.id;
    this.pharmacist.deleteCoupon(c.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.pendingDelete = null;
        this.coupons = this.coupons.filter((x) => x.id !== c.id);
        this.flash('success', 'Coupon supprimé');
      },
      error: (err) => {
        this.deletingId = null;
        this.pendingDelete = null;
        const reason = err?.error?.error || err?.error?.message || 'Suppression impossible';
        this.flash('error', typeof reason === 'string' ? reason : 'Suppression impossible');
      },
    });
  }

  toggleProductSelection(id: number): void {
    const i = this.form.productIds.indexOf(id);
    if (i === -1) this.form.productIds.push(id);
    else this.form.productIds.splice(i, 1);
  }

  toggleCategorySelection(id: number): void {
    const i = this.form.categoryIds.indexOf(id);
    if (i === -1) this.form.categoryIds.push(id);
    else this.form.categoryIds.splice(i, 1);
  }

  filteredProducts() {
    const q = this.productSearch.trim().toLowerCase();
    if (!q) return this.options.products;
    return this.options.products.filter((p) => p.name.toLowerCase().includes(q));
  }

  filteredCategories() {
    const q = this.categorySearch.trim().toLowerCase();
    if (!q) return this.options.categories;
    return this.options.categories.filter((c) => c.name.toLowerCase().includes(q));
  }

  scopeLabel(s: CouponScope): string {
    switch (s) {
      case 'PRODUCT': return 'Produits';
      case 'CATEGORY': return 'Catégories';
      case 'PHARMACY_WIDE': return 'Toute la parapharmacie';
    }
  }

  formatValue(c: Coupon): string {
    return c.type === 'PERCENT'
      ? `${this.cleanNumber(c.value)} %`
      : `${this.cleanNumber(c.value)} TND`;
  }

  cleanNumber(n: number | null | undefined): string {
    if (n === null || n === undefined) return '0';
    const s = Number(n).toString();
    return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  }

  scopeSummary(c: Coupon): string {
    if (c.scope === 'PHARMACY_WIDE') return 'Toute la parapharmacie';
    if (c.scope === 'PRODUCT') {
      const n = c.products?.length ?? 0;
      return `${n} produit${n > 1 ? 's' : ''}`;
    }
    const n = c.categories?.length ?? 0;
    return `${n} catégorie${n > 1 ? 's' : ''}`;
  }

  isExpired(c: Coupon): boolean {
    return new Date(c.validTo).getTime() < Date.now();
  }

  isPending(c: Coupon): boolean {
    return new Date(c.validFrom).getTime() > Date.now();
  }

  statusBadge(c: Coupon): { label: string; className: string } {
    if (!c.active) return { label: 'Désactivé', className: 'badge-muted' };
    if (this.isExpired(c)) return { label: 'Expiré', className: 'badge-danger' };
    if (this.isPending(c)) return { label: 'À venir', className: 'badge-warn' };
    return { label: 'Actif', className: 'badge-success' };
  }

  // ── helpers ─────────────────────────────────────────────────────────────
  private validate(): boolean {
    const f = this.form;
    if (!f.code.trim()) return this.warn('Code requis');
    if (f.value === null || f.value <= 0) return this.warn('Valeur invalide');
    if (f.type === 'PERCENT' && f.value > 100) return this.warn('Le pourcentage ne peut pas dépasser 100');
    if (!f.validFrom || !f.validTo) return this.warn('Dates de validité requises');
    if (new Date(f.validFrom) >= new Date(f.validTo))
      return this.warn('La date de fin doit être après la date de début');
    if (f.scope === 'PRODUCT' && f.productIds.length === 0)
      return this.warn('Sélectionnez au moins un produit');
    if (f.scope === 'CATEGORY' && f.categoryIds.length === 0)
      return this.warn('Sélectionnez au moins une catégorie');
    return true;
  }

  private warn(msg: string): boolean {
    this.flash('error', msg);
    return false;
  }

  private flash(type: FeedbackType, msg: string): void {
    this.feedbackType = type;
    this.feedbackMessage = msg;
    setTimeout(() => (this.feedbackMessage = ''), 4500);
  }

  private emptyForm(): FormState {
    const now = new Date();
    const inAMonth = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    return {
      id: null,
      code: '',
      type: 'PERCENT',
      value: 10,
      scope: 'PHARMACY_WIDE',
      productIds: [],
      categoryIds: [],
      minSubtotal: null,
      maxDiscount: null,
      validFrom: this.toLocalInput(now.toISOString()),
      validTo: this.toLocalInput(inAMonth.toISOString()),
      maxRedemptions: null,
      maxRedemptionsPerClient: 1,
      active: true,
    };
  }

  /** Convert ISO string from backend (assumed local) to <input type="datetime-local"> value. */
  private toLocalInput(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** Convert <input type="datetime-local"> value to ISO string for the backend. */
  private fromLocalInput(local: string): string {
    if (!local) return local;
    return local.length === 16 ? `${local}:00` : local;
  }
}
