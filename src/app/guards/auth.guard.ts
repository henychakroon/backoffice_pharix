import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.auth.isLoggedIn()) {
      this.auth.clearSession();
      this.router.navigate(['/login']);
      return false;
    }

    const isPhRoute = state.url.startsWith('/ph');

    if (isPhRoute && !this.auth.isPharmacien()) {
      this.router.navigate(['/login']);
      return false;
    }

    if (!isPhRoute && !this.auth.isAdmin()) {
      this.router.navigate(['/login']);
      return false;
    }

    return true;
  }
}
