import { Component, OnInit } from '@angular/core';
import { AdminCoupon, AdminCouponApprovalStatus, AdminService } from '../../services/admin.service';

type DecisionType = 'approve' | 'reject';
type FeedbackType = 'success' | 'error';

@Component({
  selector: 'app-coupons',
  templateUrl: './coupons.component.html',
  styleUrls: ['./coupons.component.scss']
})
export class CouponsComponent implements OnInit {
  coupons: AdminCoupon[] = [];
  loading = true;
  actingId: number | null = null;

  statusFilter: 'ALL' | AdminCouponApprovalStatus = 'ALL';
  search = '';

  decisionModalOpen = false;
  decisionType: DecisionType = 'approve';
  decisionCoupon: AdminCoupon | null = null;
  decisionNote = '';

  feedbackMessage = '';
  feedbackType: FeedbackType = 'success';

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.adminService.getCoupons().subscribe({
      next: (coupons) => {
        this.coupons = coupons;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.flash('error', 'Erreur lors du chargement des coupons');
      }
    });
  }

  get filteredCoupons(): AdminCoupon[] {
    const query = this.search.trim().toLowerCase();
    return this.coupons.filter((coupon) => {
      const approvalStatus = (coupon.approvalStatus ?? 'APPROVED') as AdminCouponApprovalStatus;
      if (this.statusFilter !== 'ALL' && approvalStatus !== this.statusFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = [coupon.code, coupon.pharmacyName, coupon.approvalReviewedBy]
        .filter((value): value is string => !!value)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  countByStatus(status: AdminCouponApprovalStatus): number {
    return this.coupons.filter((coupon) => (coupon.approvalStatus ?? 'APPROVED') === status).length;
  }

  openDecision(coupon: AdminCoupon, decision: DecisionType): void {
    this.decisionCoupon = coupon;
    this.decisionType = decision;
    this.decisionNote = '';
    this.decisionModalOpen = true;
  }

  closeDecisionModal(): void {
    if (this.actingId !== null) return;
    this.decisionModalOpen = false;
    this.decisionCoupon = null;
    this.decisionNote = '';
  }

  submitDecision(): void {
    if (!this.decisionCoupon) return;
    this.actingId = this.decisionCoupon.id;

    const action$ = this.decisionType === 'approve'
      ? this.adminService.approveCoupon(this.decisionCoupon.id, this.decisionNote)
      : this.adminService.rejectCoupon(this.decisionCoupon.id, this.decisionNote);

    action$.subscribe({
      next: (updated) => {
        this.actingId = null;
        this.closeDecisionModal();
        const idx = this.coupons.findIndex((coupon) => coupon.id === updated.id);
        if (idx !== -1) {
          this.coupons[idx] = updated;
        }
        this.flash('success', this.decisionType === 'approve' ? 'Coupon approuvé' : 'Coupon rejeté');
      },
      error: (err) => {
        this.actingId = null;
        const reason = err?.error?.error || err?.error?.message || 'Mise à jour impossible';
        this.flash('error', typeof reason === 'string' ? reason : 'Mise à jour impossible');
      }
    });
  }

  formatValue(coupon: AdminCoupon): string {
    return coupon.type === 'PERCENT'
      ? `${this.cleanNumber(coupon.value)} %`
      : `${this.cleanNumber(coupon.value)} TND`;
  }

  scopeLabel(scope: AdminCoupon['scope']): string {
    switch (scope) {
      case 'PRODUCT':
        return 'Produits';
      case 'CATEGORY':
        return 'Catégories';
      case 'PHARMACY_WIDE':
        return 'Toute la parapharmacie';
      default:
        return scope;
    }
  }

  scopeSummary(coupon: AdminCoupon): string {
    if (coupon.scope === 'PHARMACY_WIDE') return 'Toute la parapharmacie';
    if (coupon.scope === 'PRODUCT') {
      const count = coupon.products?.length ?? 0;
      return `${count} produit${count > 1 ? 's' : ''}`;
    }
    const count = coupon.categories?.length ?? 0;
    return `${count} catégorie${count > 1 ? 's' : ''}`;
  }

  statusBadge(coupon: AdminCoupon): { label: string; className: string } {
    const status = (coupon.approvalStatus ?? 'APPROVED') as AdminCouponApprovalStatus;
    if (status === 'PENDING_REVIEW') return { label: 'En attente', className: 'badge-warn' };
    if (status === 'REJECTED') return { label: 'Rejeté', className: 'badge-danger' };
    return { label: 'Approuvé', className: 'badge-success' };
  }

  cleanNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return '0';
    return Number(value).toString().replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  }

  private flash(type: FeedbackType, message: string): void {
    this.feedbackType = type;
    this.feedbackMessage = message;
    setTimeout(() => {
      this.feedbackMessage = '';
    }, 4500);
  }
}
