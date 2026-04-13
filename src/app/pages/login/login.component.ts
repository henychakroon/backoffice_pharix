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

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isLoggedIn()) this.router.navigate(['/dashboard']);
  }

  onLogin(): void {
    this.errorMessage = '';
    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }
    this.loading = true;
    // Simulate async
    setTimeout(() => {
      const ok = this.auth.login(this.email, this.password);
      this.loading = false;
      if (ok) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'Invalid email or password. Please try again.';
      }
    }, 800);
  }

  fillDemo(): void {
    this.email = 'admin@pharix.tn';
    this.password = 'admin123';
  }
}
