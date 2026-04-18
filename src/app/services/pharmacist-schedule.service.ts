import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DaySchedule {
  id?: number;
  day: string;
  openingTime: string;
  closingTime: string;
  closed: boolean;
}

@Injectable({ providedIn: 'root' })
export class PharmacistScheduleService {
  private readonly BASE = '/api/v1/pharmacien';

  constructor(private http: HttpClient) {}

  getProfile(email: string): Observable<{ online: boolean; pharmacyName: string; ownerName: string }> {
    const params = new HttpParams().set('email', email);
    return this.http.get<{ online: boolean; pharmacyName: string; ownerName: string }>(`${this.BASE}/profile`, { params });
  }

  getSchedule(email: string): Observable<DaySchedule[]> {
    const params = new HttpParams().set('email', email);
    return this.http.get<DaySchedule[]>(`${this.BASE}/schedule`, { params });
  }

  saveSchedule(email: string, days: DaySchedule[]): Observable<DaySchedule[]> {
    const params = new HttpParams().set('email', email);
    const body = days.map(s => ({
      day: s.day,
      openingTime: s.openingTime,
      closingTime: s.closingTime,
      closed: s.closed
    }));
    return this.http.put<DaySchedule[]>(`${this.BASE}/schedule/bulk`, body, { params });
  }

  updateDay(email: string, day: string, patch: Partial<DaySchedule>): Observable<DaySchedule> {
    const params = new HttpParams().set('email', email);
    return this.http.put<DaySchedule>(`${this.BASE}/schedule/${day}`, patch, { params });
  }

  setOnline(email: string, online: boolean): Observable<{ online: boolean }> {
    const params = new HttpParams().set('email', email);
    return this.http.put<{ online: boolean }>(`${this.BASE}/online`, { online }, { params });
  }
}
