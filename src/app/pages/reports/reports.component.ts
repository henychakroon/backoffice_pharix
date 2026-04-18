import { Component, OnInit } from '@angular/core';
import { AdminService, AdminReport, AdminUser } from '../../services/admin.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  reports: AdminReport[] = [];
  users: AdminUser[] = [];
  loading = true;
  actionLoading = '';
  selectedReport: AdminReport | null = null;
  confirmTarget: {
    userId: number;
    reportId: number;
    side: 'reporter' | 'reported';
    banned: boolean;
    label: string;
  } | null = null;

  searchTerm = '';
  statusFilter = 'all';
  typeFilter = 'all';

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.admin.getReports().subscribe({
      next: reports => {
        this.reports = reports;
        this.admin.getUsers().subscribe({
          next: users => {
            this.users = users;
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get filtered(): AdminReport[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.reports.filter(report => {
      const matchesSearch = !term || [
        report.type,
        report.description,
        report.reporterEmail,
        report.reportedEmail,
        report.reporterRole,
        report.reportedRole
      ].some(value => (value ?? '').toLowerCase().includes(term));

      const matchesStatus = this.statusFilter === 'all' || report.status === this.statusFilter;
      const matchesType = this.typeFilter === 'all' || report.type === this.typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }

  get counts(): Record<string, number> {
    return this.reports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      ADMIN: 'Admin',
      CLIENT: 'Client',
      PHARMACIEN: 'Pharmacien',
      LIVREUR: 'Livreur'
    };
    return labels[role] ?? role;
  }

  statusBadge(status: string): string {
    const badges: Record<string, string> = {
      OPEN: 'badge-warning',
      IN_PROGRESS: 'badge-primary',
      RESOLVED: 'badge-success'
    };
    return badges[status] ?? 'badge-gray';
  }

  openReport(report: AdminReport): void {
    this.selectedReport = report;
  }

  closeReport(): void {
    this.selectedReport = null;
  }

  openConfirm(report: AdminReport, side: 'reporter' | 'reported'): void {
    const userId = side === 'reporter' ? report.reporterId : report.reportedId;
    const email = side === 'reporter' ? report.reporterEmail : report.reportedEmail;
    this.confirmTarget = {
      userId,
      reportId: report.id,
      side,
      banned: this.isUserBanned(userId),
      label: email
    };
  }

  closeConfirm(): void {
    this.confirmTarget = null;
  }

  userById(id: number): AdminUser | undefined {
    return this.users.find(user => user.id === id);
  }

  isUserBanned(id: number): boolean {
    return this.userById(id)?.banned ?? false;
  }

  updateStatus(report: AdminReport, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'): void {
    this.actionLoading = `status-${report.id}`;
    this.admin.updateReportStatus(report.id, status).subscribe({
      next: updated => {
        this.replaceReport(updated);
        this.actionLoading = '';
      },
      error: () => {
        this.actionLoading = '';
      }
    });
  }

  banReporter(report: AdminReport): void {
    this.actionLoading = `reporter-${report.id}`;
    this.admin.banUser(report.reporterId).subscribe({
      next: updated => {
        this.replaceUser(updated);
        this.actionLoading = '';
      },
      error: () => {
        this.actionLoading = '';
      }
    });
  }

  unbanReporter(report: AdminReport): void {
    this.actionLoading = `reporter-${report.id}`;
    this.admin.unbanUser(report.reporterId).subscribe({
      next: updated => {
        this.replaceUser(updated);
        this.actionLoading = '';
      },
      error: () => {
        this.actionLoading = '';
      }
    });
  }

  banReported(report: AdminReport): void {
    this.actionLoading = `reported-${report.id}`;
    this.admin.banUser(report.reportedId).subscribe({
      next: updated => {
        this.replaceUser(updated);
        this.actionLoading = '';
      },
      error: () => {
        this.actionLoading = '';
      }
    });
  }

  unbanReported(report: AdminReport): void {
    this.actionLoading = `reported-${report.id}`;
    this.admin.unbanUser(report.reportedId).subscribe({
      next: updated => {
        this.replaceUser(updated);
        this.actionLoading = '';
      },
      error: () => {
        this.actionLoading = '';
      }
    });
  }

  confirmBanAction(): void {
    if (!this.confirmTarget) {
      return;
    }

    const report = this.reports.find(item => item.id === this.confirmTarget?.reportId);
    if (!report) {
      this.closeConfirm();
      return;
    }

    const side = this.confirmTarget.side;
    const banned = this.confirmTarget.banned;
    this.closeConfirm();

    if (side === 'reporter') {
      if (banned) {
        this.unbanReporter(report);
      } else {
        this.banReporter(report);
      }
      return;
    }

    if (banned) {
      this.unbanReported(report);
    } else {
      this.banReported(report);
    }
  }

  private replaceReport(updated: AdminReport): void {
    const index = this.reports.findIndex(report => report.id === updated.id);
    if (index !== -1) {
      this.reports[index] = updated;
      this.reports = [...this.reports];
    }
  }

  private replaceUser(updated: AdminUser): void {
    const index = this.users.findIndex(user => user.id === updated.id);
    if (index !== -1) {
      this.users[index] = updated;
      this.users = [...this.users];
    }
  }
}
