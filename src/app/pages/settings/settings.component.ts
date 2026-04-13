import { Component } from '@angular/core';
@Component({ selector: 'app-settings', template: `
<div class="animate-fadeInUp">
  <div class="page-header">
    <div><div class="page-title">Settings</div><div class="page-subtitle">Platform configuration & preferences</div></div>
    <button class="btn btn-primary btn-sm">Save changes</button>
  </div>
  <div class="empty-state" style="background:#fff;border-radius:14px;border:1px solid var(--gray-200)">
    <div class="empty-icon">⚙️</div>
    <div class="empty-title">Settings Module</div>
    <div class="empty-sub">Coming soon — system configuration</div>
  </div>
</div>` })
export class SettingsComponent {}
