import { Component, OnInit } from '@angular/core';
import {
  Coupon,
  CouponNotificationRecipient,
  CouponNotificationRequest,
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

interface NotificationFormState {
  couponId: number | null;
  couponCode: string;
  notifyAllClients: boolean;
  clientIds: number[];
  title: string;
  message: string;
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
  submittingId: number | null = null;
  deletingId: number | null = null;
  pendingDelete: Coupon | null = null;
  notifyModalOpen = false;
  notifying = false;
  recipientsLoading = false;
  recipients: CouponNotificationRecipient[] = [];
  recipientSearch = '';

  productSearch = '';
  categorySearch = '';

  feedbackMessage = '';
  feedbackType: FeedbackType = 'success';

  form: FormState = this.emptyForm();
  notifyForm: NotificationFormState = this.emptyNotificationForm();

  constructor(private pharmacist: PharmacistService) {}

  ngOnInit(): void {
    this.load();
    this.pharmacist.getCouponScopeOptions().subscribe({
      next: (opts) => (this.options = opts),
      error: () => (this.options = { products: [], categories: [] }),
    });
    this.loadRecipients();
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
        this.flash(
          'success',
          this.form.id
            ? 'Coupon mis à jour et envoyé en validation admin'
            : 'Coupon créé et envoyé en validation admin'
        );
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
    if (!this.isApproved(c)) {
      this.flash('error', 'Ce coupon doit être validé par un administrateur avant activation');
      return;
    }
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

  submitForReview(c: Coupon): void {
    this.submittingId = c.id;
    this.pharmacist.submitCouponForReview(c.id).subscribe({
      next: (updated) => {
        this.submittingId = null;
        const idx = this.coupons.findIndex((x) => x.id === updated.id);
        if (idx !== -1) this.coupons[idx] = updated;
        this.flash('success', 'Coupon renvoyé à l\'administrateur pour validation');
      },
      error: (err) => {
        this.submittingId = null;
        const reason = err?.error?.error || err?.error?.message || 'Erreur lors de la soumission';
        this.flash('error', typeof reason === 'string' ? reason : 'Erreur lors de la soumission');
      },
    });
  }

  askDelete(c: Coupon): void {
    this.pendingDelete = c;
  }

  cancelDelete(): void {
    this.pendingDelete = null;
  }

  openNotify(coupon: Coupon): void {
    if (!this.isApproved(coupon)) {
      this.flash('error', 'Le coupon doit être validé par un administrateur avant notification');
      return;
    }
    this.notifyForm = {
      couponId: coupon.id,
      couponCode: coupon.code,
      notifyAllClients: true,
      clientIds: [],
      title: `Nouveau code promo: ${coupon.code}`,
      message: this.defaultNotificationMessage(coupon),
    };
    this.recipientSearch = '';
    this.notifyModalOpen = true;
    if (this.recipients.length === 0 && !this.recipientsLoading) {
      this.loadRecipients();
    }
  }

  closeNotifyModal(): void {
    if (this.notifying) return;
    this.notifyModalOpen = false;
  }

  sendNotification(): void {
    if (!this.notifyForm.couponId) return;
    if (!this.notifyForm.notifyAllClients && this.notifyForm.clientIds.length === 0) {
      this.flash('error', 'Sélectionnez au moins un client');
      return;
    }

    const payload: CouponNotificationRequest = {
      notifyAllClients: this.notifyForm.notifyAllClients,
      clientIds: this.notifyForm.notifyAllClients ? [] : this.notifyForm.clientIds,
      title: this.notifyForm.title.trim(),
      message: this.notifyForm.message.trim(),
    };

    this.notifying = true;
    this.pharmacist.sendCouponNotification(this.notifyForm.couponId, payload).subscribe({
      next: (result) => {
        this.notifying = false;
        this.notifyModalOpen = false;
        this.flash('success', `Notification envoyée à ${result.sentCount} client(s)`);
      },
      error: (err) => {
        this.notifying = false;
        const reason = err?.error?.error || err?.error?.message || err?.error || 'Échec de l\'envoi';
        this.flash('error', typeof reason === 'string' ? reason : 'Échec de l\'envoi');
      },
    });
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

  toggleRecipientSelection(id: number): void {
    const i = this.notifyForm.clientIds.indexOf(id);
    if (i === -1) this.notifyForm.clientIds.push(id);
    else this.notifyForm.clientIds.splice(i, 1);
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

  filteredRecipients() {
    const q = this.recipientSearch.trim().toLowerCase();
    if (!q) return this.recipients;
    return this.recipients.filter((client) => {
      const haystack = [client.fullName, client.phone, client.email]
        .filter((value): value is string => !!value)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
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
    if (c.approvalStatus === 'REJECTED') {
      return { label: 'Rejeté par admin', className: 'badge-danger' };
    }
    if ((c.approvalStatus ?? 'APPROVED') !== 'APPROVED') {
      return { label: 'En attente admin', className: 'badge-info' };
    }
    if (!c.active) return { label: 'Désactivé', className: 'badge-muted' };
    if (this.isExpired(c)) return { label: 'Expiré', className: 'badge-danger' };
    if (this.isPending(c)) return { label: 'À venir', className: 'badge-warn' };
    return { label: 'Actif', className: 'badge-success' };
  }

  isApproved(c: Coupon): boolean {
    return (c.approvalStatus ?? 'APPROVED') === 'APPROVED';
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

  private loadRecipients(): void {
    this.recipientsLoading = true;
    this.pharmacist.getCouponNotificationRecipients().subscribe({
      next: (recipients) => {
        this.recipients = recipients;
        this.recipientsLoading = false;
      },
      error: () => {
        this.recipients = [];
        this.recipientsLoading = false;
      },
    });
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

  private emptyNotificationForm(): NotificationFormState {
    return {
      couponId: null,
      couponCode: '',
      notifyAllClients: true,
      clientIds: [],
      title: '',
      message: '',
    };
  }

  private defaultNotificationMessage(coupon: Coupon): string {
    const reduction = coupon.type === 'PERCENT'
      ? `${this.cleanNumber(coupon.value)} %`
      : `${this.cleanNumber(coupon.value)} TND`;
    const validTo = new Date(coupon.validTo);
    const formattedDate = Number.isNaN(validTo.getTime())
      ? coupon.validTo
      : validTo.toLocaleDateString('fr-FR');
    return `Utilisez le code ${coupon.code} pour profiter de ${reduction} sur la parapharmacie. Offre valable jusqu'au ${formattedDate}.`;
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
