import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface AdminLoginResponse {
  access_token: string;
  refresh_token: string;
  role: string;
  userId: number;
}

export interface PharmacienLoginResponse {
  access_token: string;
  refresh_token: string;
  role: string;
  userId: number;
  profile: {
    pharmacyName: string;
    ownerName: string;
    online: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly SESSION_KEY      = 'pharix_admin_session';
  private readonly ACCESS_TOKEN_KEY  = 'pharix_access_token';
  private readonly REFRESH_TOKEN_KEY = 'pharix_refresh_token';
  private readonly API = '/api/v1/auth';

  constructor(private http: HttpClient, private router: Router) {}

  // ── Cookie helpers ─────────────────────────────────────────────────────────
  // The JWT itself also lives in an HttpOnly cookie set by the server —
  // JS cannot read or steal it even under XSS.

  private setCookie(name: string, value: string, days = 1): void {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie =
      `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
  }

  private getCookie(name: string): string | null {
    const match = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
  }

  private clearCookie(name: string): void {
    document.cookie =
      `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
  }

  // ── Auth API ──────────────────────────────────────────────────────────────

  login(email: string, password: string): Observable<AdminLoginResponse> {
    return this.http
      .post<AdminLoginResponse>(`${this.API}/login_admin`, { email, password }, { withCredentials: true })
      .pipe(
        tap(res => {
          // Access & refresh tokens also returned in body for Angular-side use
          this.setCookie(this.ACCESS_TOKEN_KEY, res.access_token);
          this.setCookie(this.REFRESH_TOKEN_KEY, res.refresh_token, 7);
          this.setCookie(this.SESSION_KEY, JSON.stringify({ role: res.role, userId: res.userId }));
        })
      );
  }

  loginPharmacien(email: string, password: string): Observable<PharmacienLoginResponse> {
    return this.http
      .post<PharmacienLoginResponse>(`${this.API}/login`, { email, password })
      .pipe(
        tap(res => {
          this.setCookie(this.ACCESS_TOKEN_KEY, res.access_token);
          this.setCookie(this.REFRESH_TOKEN_KEY, res.refresh_token, 7);
          this.setCookie(this.SESSION_KEY, JSON.stringify({
            role: res.role,
            userId: res.userId,
            pharmacyName: res.profile.pharmacyName,
            ownerName: res.profile.ownerName,
            email
          }));
        })
      );
  }

  logout(): void {
    const session = this.getCurrentUser();
    if (session?.role === 'ADMIN') {
      this.http
        .post(`${this.API}/logout_admin`, {}, { withCredentials: true })
        .subscribe({ complete: () => this.finishLogout() });
    } else {
      this.finishLogout();
    }
  }

  private finishLogout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  clearSession(): void {
    this.clearCookie(this.ACCESS_TOKEN_KEY);
    this.clearCookie(this.REFRESH_TOKEN_KEY);
    this.clearCookie(this.SESSION_KEY);
  }

  getAccessToken(): string | null {
    return this.getCookie(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.getCookie(this.REFRESH_TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    if (!this.getCookie(this.SESSION_KEY)) return false;
    return !this.isTokenExpired();
  }

  isTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // exp is in seconds, Date.now() is ms
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  getCurrentUser(): { role: string; userId: number; pharmacyName?: string; ownerName?: string; email?: string } | null {
    const raw = this.getCookie(this.SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  isPharmacien(): boolean {
    return this.getCurrentUser()?.role === 'PHARMACIEN';
  }

  isAdmin(): boolean {
    return this.getCurrentUser()?.role === 'ADMIN';
  }
}

