import { Component, OnInit } from '@angular/core';
import { PharmacistService, PharmacienDashboard } from '../../../services/pharmacist.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-pharmacist-dashboard',
  templateUrl: './pharmacist-dashboard.component.html',
  styleUrls: ['./pharmacist-dashboard.component.scss']
})
export class PharmacistDashboardComponent implements OnInit {
  dashboard: PharmacienDashboard | null = null;
  loading = true;
  pharmacyName = '';

  constructor(
    private pharmacistService: PharmacistService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.pharmacyName = user?.pharmacyName ?? '';
    if (user?.email) {
      this.pharmacistService.getDashboard(user.email).subscribe({
        next: d => { this.dashboard = d; this.loading = false; },
        error: () => { this.loading = false; }
      });
    }
  }
}
