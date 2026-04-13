import { Component } from '@angular/core';
@Component({ selector: 'app-categories', template: `
<div class="animate-fadeInUp">
  <div class="page-header">
    <div><div class="page-title">Categories</div><div class="page-subtitle">Organize products by category</div></div>
    <button class="btn btn-primary btn-sm">+ Add Category</button>
  </div>
  <div class="empty-state" style="background:#fff;border-radius:14px;border:1px solid var(--gray-200)">
    <div class="empty-icon">🏷️</div>
    <div class="empty-title">Categories Module</div>
    <div class="empty-sub">Coming soon — category management</div>
  </div>
</div>` })
export class CategoriesComponent {}
