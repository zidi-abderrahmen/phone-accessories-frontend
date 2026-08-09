import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { CategoryResponse } from '../../core/models/category/category-response';
import { CategoryService } from '../../core/services/category/category.service';
import { CommonModule, Location } from '@angular/common';

interface ProductResponse {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  stock: number;
  brand: string;
  createdAt: string;
}

interface ProductViewModel extends ProductResponse {
  discountPercent?: number;
}

type PageState = 'loading' | 'loaded' | 'empty' | 'not-found' | 'error';
type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'popularity';

@Component({
  selector: 'app-category-details',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './category-details.html',
  styleUrl: './category-details.scss',
})
export class CategoryDetails implements OnInit, OnDestroy {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly categoryService = inject(CategoryService);
  private readonly destroy$ = new Subject<void>();

  state = signal<PageState>('loading');
  category: CategoryResponse | null = null;
  products: ProductViewModel[] = [];
  displayedProducts: ProductViewModel[] = [];

  searchQuery = '';
  sortOption: SortOption = 'newest';
  brands: string[] = [];
  selectedBrands: string[] = [];

  errorMessage: string | null = null;
  categoryId: number | null = null;

  ngOnInit(): void {
    this.extractCategoryId();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private extractCategoryId(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const idParam = params.get('id');
        const id = idParam ? parseInt(idParam, 10) : NaN;

        if (!idParam || isNaN(id)) {
          this.state.set('not-found');
          this.errorMessage = 'Invalid category identifier.';
          return;
        }

        this.categoryId = id;
        this.loadCategoryAndProducts(id);
      });
  }

  loadCategoryAndProducts(id: number): void {
    this.state.set('loading');
    this.errorMessage = null;

    this.categoryService.getCategoryById(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (this.state() === 'loading') {
            this.state.set('loaded');
          }
        })
      )
      .subscribe({
        next: (cat) => {
          this.category = cat;
          // In a real app, products would come from ProductService.
          // Here we simulate with an empty list until the backend is wired.
          // Replace this block with a forkJoin or chained call to your
          // ProductService.getProductsByCategory(id) when ready.
          this.products = [];
          this.applyFilters();
          this.extractBrands();
          this.state.set(this.products.length === 0 ? 'empty' : 'loaded');
        },
        error: (err) => {
          this.handleCategoryError(err);
        }
      });
  }

  private handleCategoryError(err: any): void {
    if (err.status === 404) {
      this.state.set('not-found');
      this.errorMessage = 'The category you are looking for does not exist.';
    } else if (err.status === 0) {
      this.state.set('error');
      this.errorMessage = 'Unable to connect to the server. Please check your connection.';
    } else if (err.error?.message) {
      this.state.set('error');
      this.errorMessage = err.error.message;
    } else {
      this.state.set('error');
      this.errorMessage = 'Failed to load category. Please try again later.';
    }
  }

  // ------------------------------------------------------------------
  // Product filtering & sorting (client-side until ProductService is wired)
  // ------------------------------------------------------------------

  onSearch(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  onSortChange(event: Event): void {
    this.sortOption = (event.target as HTMLSelectElement).value as SortOption;
    this.applyFilters();
  }

  toggleBrand(brand: string): void {
    const idx = this.selectedBrands.indexOf(brand);
    if (idx === -1) {
      this.selectedBrands.push(brand);
    } else {
      this.selectedBrands.splice(idx, 1);
    }
    this.applyFilters();
  }

  clearBrandFilters(): void {
    this.selectedBrands = [];
    this.applyFilters();
  }

  private applyFilters(): void {
    let result = [...this.products];

    // Search
    if (this.searchQuery) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(this.searchQuery) ||
        p.description.toLowerCase().includes(this.searchQuery) ||
        p.brand.toLowerCase().includes(this.searchQuery)
      );
    }

    // Brand filter
    if (this.selectedBrands.length > 0) {
      result = result.filter(p => this.selectedBrands.includes(p.brand));
    }

    // Sort
    switch (this.sortOption) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'popularity':
        result.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    this.displayedProducts = result;
  }

  private extractBrands(): void {
    const brandSet = new Set(this.products.map(p => p.brand));
    this.brands = Array.from(brandSet).sort();
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  getDiscountPercent(product: ProductViewModel): number {
    if (!product.originalPrice || product.originalPrice <= product.price) return 0;
    return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  }

  getStockLabel(stock: number): { text: string; variant: 'in' | 'low' | 'out' } {
    if (stock <= 0) return { text: 'Out of stock', variant: 'out' };
    if (stock <= 5) return { text: 'Low stock', variant: 'low' };
    return { text: 'In stock', variant: 'in' };
  }

  goBack(): void {
    this.location.back();
  }

  navigateToProduct(productId: number): void {
    this.router.navigate(['/products', productId]);
  }

  trackById(index: number, product: ProductViewModel): number {
    return product.id;
  }
}