import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Attach credentials (HttpOnly cookie) to every API request.
    // The JWT is never readable by JavaScript — the browser sends it automatically.
    if (req.url.startsWith('/api')) {
      req = req.clone({ withCredentials: true });
    }
    return next.handle(req);
  }
}
