import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminService, RevenueConfig } from '../../services/admin.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  loading = true;
  saving = false;
  saved = false;
  error: string | null = null;

  // Delivery
  deliveryPrice: number | null = null;
  freeDeliveryThreshold: number | null = null;

  // Revenue
  medicamentServiceFee: number | null = null;
  parapharmacieCommissionPercent: number | null = null;
  pharmacistMonthlySubscription: number | null = null;
  nightDeliveryPrice: number | null = null;
  nightStartHour: number | null = null;
  nightEndHour: number | null = null;

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    forkJoin({
      delivery: this.admin.getDeliveryConfig(),
      revenue: this.admin.getRevenueConfig()
    }).subscribe({
      next: ({ delivery, revenue }) => {
        this.deliveryPrice = delivery.deliveryPrice;
        this.freeDeliveryThreshold = delivery.freeDeliveryThreshold;

        this.medicamentServiceFee = revenue.medicamentServiceFee;
        this.parapharmacieCommissionPercent = revenue.parapharmacieCommissionPercent;
        this.pharmacistMonthlySubscription = revenue.pharmacistMonthlySubscription;
        this.nightDeliveryPrice = revenue.nightDeliveryPrice;
        this.nightStartHour = revenue.nightStartHour;
        this.nightEndHour = revenue.nightEndHour;

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  save(): void {
    if (this.deliveryPrice === null || this.deliveryPrice < 0) return;

    this.saving = true;
    this.saved = false;
    this.error = null;

    const threshold = this.freeDeliveryThreshold ?? 0;

    const revenuePayload: RevenueConfig = {
      medicamentServiceFee: this.medicamentServiceFee ?? 0,
      parapharmacieCommissionPercent: this.parapharmacieCommissionPercent ?? 0,
      pharmacistMonthlySubscription: this.pharmacistMonthlySubscription ?? 0,
      nightDeliveryPrice: this.nightDeliveryPrice ?? 0,
      nightStartHour: this.nightStartHour ?? 21,
      nightEndHour: this.nightEndHour ?? 5
    };

    forkJoin({
      delivery: this.admin.saveDeliveryConfig(this.deliveryPrice, threshold),
      revenue: this.admin.saveRevenueConfig(revenuePayload)
    }).subscribe({
      next: ({ delivery, revenue }) => {
        this.deliveryPrice = delivery.deliveryPrice;
        this.freeDeliveryThreshold = delivery.freeDeliveryThreshold;

        this.medicamentServiceFee = revenue.medicamentServiceFee;
        this.parapharmacieCommissionPercent = revenue.parapharmacieCommissionPercent;
        this.pharmacistMonthlySubscription = revenue.pharmacistMonthlySubscription;
        this.nightDeliveryPrice = revenue.nightDeliveryPrice;
        this.nightStartHour = revenue.nightStartHour;
        this.nightEndHour = revenue.nightEndHour;

        this.saving = false;
        this.saved = true;
        setTimeout(() => (this.saved = false), 3000);
      },
      error: () => {
        this.saving = false;
        this.error = 'Échec de la sauvegarde. Veuillez réessayer.';
      }
    });
  }
}
