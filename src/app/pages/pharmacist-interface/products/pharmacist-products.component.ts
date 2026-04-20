import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import {
  PharmacistProductFilters,
  PharmacistProductItem,
  PharmacistProductPage,
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
  orderContextLabel = '';
  orderId: number | null = null;
  orderProductIds: number[] = [];
  clientName = '';
  hasOrderContext = false;

  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  constructor(
    private pharmacistService: PharmacistService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.resetAndLoad());

    this.loadFilterOptions();

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.orderId = params.get('orderId') ? Number(params.get('orderId')) : null;
      this.orderProductIds = this.extractProductIds(params.get('productIds'), params.get('productId'));
      this.clientName = params.get('clientName')?.trim() || '';
      this.searchTerm = params.get('orderDescription')?.trim() || '';
      this.hasOrderContext = this.orderProductIds.length > 0 || !!this.searchTerm;
      this.pageSize = Math.max(25, this.orderProductIds.length || 25);
      this.page = 0;

      if (this.orderProductIds.length > 0) {
        this.orderContextLabel = this.buildProductContextLabel();
        this.loadProducts();
        return;
      }

      if (this.hasOrderContext) {
        this.loadProductsForOrderContext();
        return;
      }

      this.orderContextLabel = '';
      this.loadProducts();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts(): void {
    this.loading = true;
    this.pharmacistService.getProducts({
      productIds: this.orderProductIds.length > 0 ? this.orderProductIds : undefined,
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

  clearOrderContext(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        orderId: null,
        productIds: null,
        productId: null,
        orderDescription: null,
        clientName: null
      },
      queryParamsHandling: 'merge'
    });
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
    if (this.orderProductIds.length > 0) {
      this.loadProducts();
      return;
    }

    if (this.hasOrderContext) {
      this.loadProductsForOrderContext();
      return;
    }

    this.loadProducts();
  }

  private setFeedback(type: FeedbackType, message: string): void {
    this.feedbackType = type;
    this.feedbackMessage = message;
  }

  private loadProductsForOrderContext(): void {
    const terms = this.extractOrderTerms(this.searchTerm);

    if (terms.length === 0) {
      this.hasOrderContext = false;
      this.orderContextLabel = '';
      this.loadProducts();
      return;
    }

    this.loading = true;
    this.feedbackMessage = '';
    this.orderContextLabel = this.buildOrderContextLabel(terms);

    const requests = terms.map(term =>
      this.pharmacistService.getProducts({
        search: term,
        category: this.selectedCategory || undefined,
        subCategory: this.selectedSubCategory || undefined,
        available: this.availabilityQueryValue,
        page: 0,
        size: 50
      })
    );

    forkJoin(requests.length > 0 ? requests : [of<PharmacistProductPage>({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 50 })]).subscribe({
      next: responses => {
        const merged = new Map<number, PharmacistProductItem>();

        responses.forEach(response => {
          response.content.forEach(product => {
            merged.set(product.productId, product);
          });
        });

        this.products = Array.from(merged.values()).sort((left, right) => left.productName.localeCompare(right.productName));
        this.totalElements = this.products.length;
        this.totalPages = this.products.length > 0 ? 1 : 0;
        this.page = 0;
        this.pageSize = Math.max(this.products.length, 1);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.setFeedback('error', 'Impossible de charger les produits liés à cette commande.');
      }
    });
  }

  private extractOrderTerms(description: string): string[] {
    return description
      .split(/\+|,|\/| et |;/i)
      .map(term => term.replace(/\bx\s*\d+\b/gi, '').replace(/\s+/g, ' ').trim())
      .filter(term => term.length >= 3)
      .filter((term, index, all) => all.indexOf(term) === index);
  }

  private buildOrderContextLabel(terms: string[]): string {
    const orderLabel = this.orderId ? `Commande #${this.orderId}` : 'Commande sélectionnée';
    const clientLabel = this.clientName ? ` de ${this.clientName}` : '';
    return `${orderLabel}${clientLabel} · ${terms.length} produit${terms.length > 1 ? 's' : ''} détecté${terms.length > 1 ? 's' : ''}`;
  }

  private buildProductContextLabel(): string {
    const orderLabel = this.orderId ? `Commande #${this.orderId}` : 'Commande sélectionnée';
    const clientLabel = this.clientName ? ` de ${this.clientName}` : '';
    return `${orderLabel}${clientLabel} · ${this.orderProductIds.length} produit${this.orderProductIds.length > 1 ? 's' : ''}`;
  }

  private extractProductIds(productIdsParam: string | null, legacyProductIdParam: string | null): number[] {
    const rawValues: string[] = [];

    if (productIdsParam) {
      rawValues.push(...productIdsParam.split(','));
    }

    if (legacyProductIdParam) {
      rawValues.push(legacyProductIdParam);
    }

    return rawValues
      .map(value => Number(value.trim()))
      .filter(value => Number.isFinite(value) && value > 0)
      .filter((value, index, all) => all.indexOf(value) === index);
  }
}