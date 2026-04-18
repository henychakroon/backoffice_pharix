import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { PharmacistScheduleService, DaySchedule } from '../../services/pharmacist-schedule.service';

const DAY_LABELS: Record<string, string> = {
  MONDAY:    'Lundi',
  TUESDAY:   'Mardi',
  WEDNESDAY: 'Mercredi',
  THURSDAY:  'Jeudi',
  FRIDAY:    'Vendredi',
  SATURDAY:  'Samedi',
  SUNDAY:    'Dimanche',
};

@Component({
  selector: 'app-pharmacist-schedule',
  templateUrl: './pharmacist-schedule.component.html',
  styleUrls: ['./pharmacist-schedule.component.scss']
})
export class PharmacistScheduleComponent implements OnInit {
  schedule: DaySchedule[] = [];
  loading = true;
  saving = false;
  savingDay = '';
  online = false;
  togglingOnline = false;
  email = '';
  saved = false;
  errorMsg = '';

  constructor(
    private scheduleService: PharmacistScheduleService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.email = user?.email ?? '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.scheduleService.getSchedule(this.email).subscribe({
      next: days => {
        this.schedule = days;
        this.loading  = false;
        // load online status independently — don't block schedule display
        this.scheduleService.getProfile(this.email).subscribe({
          next: p  => { this.online = p.online; },
          error: () => {}
        });
      },
      error: (err) => {
        this.errorMsg = `Erreur chargement: ${err?.status ?? ''} ${err?.error?.message ?? err?.message ?? ''}`;
        this.loading = false;
      }
    });
  }

  dayLabel(day: string): string {
    return DAY_LABELS[day] ?? day;
  }

  toggleClosed(day: DaySchedule): void {
    day.closed = !day.closed;
    this.saveDay(day);
  }

  saveDay(day: DaySchedule): void {
    this.savingDay = day.day;
    this.errorMsg = '';
    this.scheduleService.updateDay(this.email, day.day, {
      openingTime: day.openingTime,
      closingTime: day.closingTime,
      closed: day.closed
    }).subscribe({
      next: updated => {
        this.schedule = this.schedule.map(item => item.day === updated.day ? updated : item);
        this.savingDay = '';
      },
      error: (err) => {
        this.savingDay = '';
        this.errorMsg = `Erreur sauvegarde jour: ${err?.status ?? ''} ${err?.error?.message ?? err?.message ?? ''}`;
        this.load();
      }
    });
  }

  saveAll(): void {
    this.saving = true;
    this.errorMsg = '';
    this.scheduleService.saveSchedule(this.email, this.schedule).subscribe({
      next: data => {
        this.schedule = data;
        this.saving = false;
        this.saved = true;
        setTimeout(() => this.saved = false, 3000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = `Erreur sauvegarde: ${err?.status ?? ''} ${err?.error?.message ?? err?.message ?? ''}`;
      }
    });
  }

  toggleOnline(): void {
    this.togglingOnline = true;
    this.errorMsg = '';
    this.scheduleService.setOnline(this.email, !this.online).subscribe({
      next: res => { this.online = res.online; this.togglingOnline = false; },
      error: (err) => {
        this.togglingOnline = false;
        this.errorMsg = `Erreur statut: ${err?.status ?? ''} ${err?.error?.message ?? err?.message ?? ''}`;
      }
    });
  }
}
