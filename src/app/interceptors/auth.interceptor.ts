import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const API_ORIGIN = 'http://localhost:8082';
const NGINX_BASIC_AUTH = btoa('admin:GREG321BRO342103324EF');

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private auth: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (req.url.startsWith('/api')) {
      const token = this.auth.getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Basic ${NGINX_BASIC_AUTH}`
      };

      // Keep app token available in a separate header while nginx consumes Authorization.
      if (token) {
        headers['X-Access-Token'] = `Bearer ${token}`;
      }

      req = req.clone({
        url: `${API_ORIGIN}${req.url}`,
        setHeaders: headers,
        withCredentials: true
      });
    }

    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          // Token expired or invalid — clear session and redirect
          this.auth.clearSession();
          this.router.navigate(['/login']);
        }
        return throwError(() => err);
      })
    );
  }
}
