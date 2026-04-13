import { Component } from '@angular/core';
@Component({ selector: 'app-products', template: `
<div class="animate-fadeInUp">
  <div class="page-header">
    <div><div class="page-title">Products</div><div class="page-subtitle">Manage the medication catalogue</div></div>
    <button class="btn btn-primary btn-sm">+ Add Product</button>
  </div>
  <div class="empty-state" style="background:#fff;border-radius:14px;border:1px solid var(--gray-200)">
    <div class="empty-icon">💊</div>
    <div class="empty-title">Products Module</div>
    <div class="empty-sub">Coming soon — catalogue management</div>
  </div>
</div>` })
export class ProductsComponent {}
