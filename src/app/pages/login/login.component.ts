import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;
  rememberMe = false;
  loading = false;
  errorMessage = '';
  loginMode: 'admin' | 'pharmacien' = 'admin';

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isLoggedIn()) {
      this.router.navigate([this.auth.isPharmacien() ? '/ph/dashboard' : '/dashboard']);
    }
  }

  onLogin(): void {
    this.errorMessage = '';
    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }
    this.loading = true;

    if (this.loginMode === 'pharmacien') {
      this.auth.loginPharmacien(this.email, this.password).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/ph/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 401 || err.status === 403) {
            this.errorMessage = err.error?.error ?? 'Identifiants invalides ou accès refusé.';
          } else {
            this.errorMessage = 'Erreur serveur. Veuillez réessayer.';
          }
        }
      });
    } else {
      this.auth.login(this.email, this.password).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 401 || err.status === 403) {
            this.errorMessage = err.error?.error ?? 'Identifiants invalides ou accès refusé.';
          } else {
            this.errorMessage = 'Erreur serveur. Veuillez réessayer.';
          }
        }
      });
    }
  }

  fillDemo(): void {
    this.email = 'admin@pharix.tn';
    this.password = 'admin123';
    this.loginMode = 'admin';
  }
}
