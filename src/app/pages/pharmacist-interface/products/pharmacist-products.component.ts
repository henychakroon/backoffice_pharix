import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import {
  PharmacistProductFilters,
  PharmacistProductItem,
  PharmacistService
} from '../../../services/pharmacist.service';

type AvailabilityFilter = 'all' | 'available' | 'unavailable';
type FeedbackType = 'success' | 'error';

@Component({
  selector: 'app-pharmacist-products',
  templateUrl: './pharmacist-products.component.html',
  styleUrls: ['./pharmacist-products.component.scss']
})
export class PharmacistProductsComponent implements OnInit, OnDestroy {
  products: PharmacistProductItem[] = [];
  categories: string[] = [];
  subCategories: string[] = [];

  loading = true;
  actionProductId: number | null = null;
  page = 0;
  pageSize = 25;
  totalElements = 0;
  totalPages = 0;

  searchTerm = '';
  selectedCategory = '';
  selectedSubCategory = '';
  availabilityFilter: AvailabilityFilter = 'all';

  feedbackMessage = '';
  feedbackType: FeedbackType = 'success';

  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  constructor(private pharmacistService: PharmacistService) {}

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.resetAndLoad());

    this.loadFilterOptions();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts(): void {
    this.loading = true;
    this.pharmacistService.getProducts({
      search: this.searchTerm.trim() || undefined,
      category: this.selectedCategory || undefined,
      subCategory: this.selectedSubCategory || undefined,
      available: this.availabilityQueryValue,
      page: this.page,
      size: this.pageSize
    }).subscribe({
      next: response => {
        this.products = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.page = response.page;
        this.pageSize = response.size;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.setFeedback('error', 'Impossible de charger le catalogue de la pharmacie.');
      }
    });
  }

  get totalProducts(): number {
    return this.totalElements;
  }

  get currentPageLabel(): number {
    return this.totalPages === 0 ? 0 : this.page + 1;
  }

  get hasPreviousPage(): boolean {
    return this.page > 0;
  }

  get hasNextPage(): boolean {
    return this.page + 1 < this.totalPages;
  }

  get pageSizeOptions(): number[] {
    return [25, 50, 100];
  }

  get availabilityQueryValue(): boolean | null {
    if (this.availabilityFilter === 'available') return true;
    if (this.availabilityFilter === 'unavailable') return false;
    return null;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedSubCategory = '';
    this.availabilityFilter = 'all';
    this.resetAndLoad();
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.search$.next(value.trim().toLowerCase());
  }

  onFilterChange(): void {
    this.resetAndLoad();
  }

  changePage(nextPage: number): void {
    if (nextPage < 0 || nextPage >= this.totalPages || nextPage === this.page) {
      return;
    }
    this.page = nextPage;
    this.loadProducts();
  }

  onPageSizeChange(size: string): void {
    this.pageSize = Number(size) || 25;
    this.resetAndLoad();
  }

  toggleAvailability(product: PharmacistProductItem, event: Event): void {
    event.stopPropagation();
    const nextAvailability = !product.available;
    this.actionProductId = product.productId;

    this.pharmacistService.updateProductAvailability(product.productId, nextAvailability).subscribe({
      next: updated => {
        this.actionProductId = null;
        this.setFeedback(
          'success',
          updated.available
            ? `${updated.productName} est de nouveau disponible.`
            : `${updated.productName} a été marqué indisponible.`
        );
        this.loadProducts();
      },
      error: () => {
        this.actionProductId = null;
        this.setFeedback('error', 'La disponibilité du produit n\'a pas pu être mise à jour.');
      }
    });
  }

  trackByProduct(_: number, product: PharmacistProductItem): number {
    return product.productId;
  }

  priceLabel(price: number | null): string {
    if (price == null) {
      return '—';
    }
    return `${price.toFixed(3)} TND`;
  }

  private loadFilterOptions(): void {
    this.pharmacistService.getProductFilters().subscribe({
      next: (filters: PharmacistProductFilters) => {
        this.categories = filters.categories;
        this.subCategories = filters.subCategories;
      }
    });
  }

  private resetAndLoad(): void {
    this.page = 0;
    this.loadProducts();
  }

  private setFeedback(type: FeedbackType, message: string): void {
    this.feedbackType = type;
    this.feedbackMessage = message;
  }
}