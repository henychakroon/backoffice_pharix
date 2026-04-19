import { Component, OnInit } from '@angular/core';
import { PharmacistService, NearbyPharmacy } from '../../../services/pharmacist.service';

@Component({
  selector: 'app-pharmacist-nearby-pharmacies',
  templateUrl: './pharmacist-nearby-pharmacies.component.html',
  styleUrls: ['./pharmacist-nearby-pharmacies.component.scss']
})
export class PharmacistNearbyPharmaciesComponent implements OnInit {
  pharmacies: NearbyPharmacy[] = [];
  nearestPharmacy: NearbyPharmacy | null = null;
  nearestOpenPharmacy: NearbyPharmacy | null = null;

  radiusKm = 10;
  loadingLocation = false;
  loading = false;
  error = '';
  currentPosition: { latitude: number; longitude: number } | null = null;

  constructor(private pharmacistService: PharmacistService) {}

  ngOnInit(): void {
    this.refreshLocation();
  }

  refreshLocation(): void {
    this.error = '';
    this.loadingLocation = true;

    if (!('geolocation' in navigator)) {
      this.loadingLocation = false;
      this.error = 'La geolocalisation n\'est pas disponible sur cet appareil.';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        this.currentPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        this.loadingLocation = false;
        this.loadNearbyPharmacies();
      },
      () => {
        this.loadingLocation = false;
        this.error = 'Impossible de recuperer votre position actuelle.';
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  onRadiusChange(): void {
    if (this.currentPosition) {
      this.loadNearbyPharmacies();
    }
  }

  openDirections(pharmacy: NearbyPharmacy): void {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`,
      '_blank'
    );
  }

  trackByPharmacy(_: number, pharmacy: NearbyPharmacy): number {
    return pharmacy.id;
  }

  hasOpeningHours(pharmacy: NearbyPharmacy): boolean {
    return !!pharmacy.openingTime && !!pharmacy.closingTime;
  }

  hoursLabel(pharmacy: NearbyPharmacy): string {
    if (this.hasOpeningHours(pharmacy)) {
      return `${pharmacy.openingTime} - ${pharmacy.closingTime}`;
    }

    if (pharmacy.isOpen) {
      return 'Ouverte actuellement';
    }

    if (pharmacy.closedToday) {
      return 'Fermee aujourd\'hui';
    }

    return 'Horaires indisponibles';
  }

  showClosedHoursStyle(pharmacy: NearbyPharmacy): boolean {
    return !pharmacy.isOpen && pharmacy.closedToday;
  }

  private loadNearbyPharmacies(): void {
    if (!this.currentPosition) {
      return;
    }

    this.loading = true;
    this.pharmacistService.getNearbyPharmacies(
      this.currentPosition.latitude,
      this.currentPosition.longitude,
      this.radiusKm
    ).subscribe({
      next: pharmacies => {
        this.pharmacies = pharmacies;
        this.nearestPharmacy = pharmacies[0] ?? null;
        this.nearestOpenPharmacy = pharmacies.find(pharmacy => pharmacy.isOpen) ?? null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger les pharmacies proches.';
      }
    });
  }
}