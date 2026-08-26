import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, finalize, forkJoin, takeUntil } from 'rxjs';
import { CategoryResponse } from '../../core/models/category/category-response';
import { CategoryService } from '../../core/services/category/category.service';
import { AccessoryResponse } from '../../core/models/accessory/accessory-response';
import { CommonModule, Location } from '@angular/common';
import { UserService } from '../../core/services/user/user.service';
import { WishlistService } from '../../core/services/wishlist/wishlist.service';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type PageState = 'loading' | 'loaded' | 'empty' | 'not-found' | 'error';
type SortOption = 'newest' | 'price-asc' | 'price-desc';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);
  private readonly wishlistService = inject(WishlistService);

  readonly placeholderImage = 'assets/placeholder-product.svg';

  state = signal<PageState>('loading');
  category: CategoryResponse | null = null;
  accessories: AccessoryResponse[] = [];
  displayedAccessories: AccessoryResponse[] = [];

  searchQuery = '';
  sortOption: SortOption = 'newest';

  errorMessage: string | null = null;
  categoryId: number | null = null;

  protected readonly pendingWishlistIds = signal<ReadonlySet<number>>(new Set());
  protected readonly addedWishlistId = signal<number | null>(null);
  private addedWishlistTimeout: ReturnType<typeof setTimeout> | null = null;
  protected wishlistIds = signal<number[]>([]);
  protected readonly wishlistSet = computed(() => new Set(this.wishlistIds()));

  ngOnInit(): void {
    this.extractCategoryId();
    this.loadWishlistIds();
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
        this.loadCategoryAndAccessories(id);
      });
  }

  isWishlistPending(accessory: AccessoryResponse): boolean {
    return this.pendingWishlistIds().has(accessory.id);
  }

  addToWishlist(event: Event, accessory: AccessoryResponse): void {
    event.stopPropagation();

    if (this.isWishlistPending(accessory)) return;

    if (!this.userService.isAuthenticatedValue()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.setWishlistPending(accessory.id, true);

    if (this.wishlistSet().has(accessory.id)) {
      this.wishlistService.removeFromWishlist(accessory.id).subscribe({
        next: () => {
          this.setWishlistPending(accessory.id, false);
          this.removeByValue(accessory.id);
        },
        error: (err: HttpErrorResponse) => {
          this.setWishlistPending(accessory.id, false);
          console.error('Failed to remove from wishlist:', err);
        }
      });
    } else {
      this.wishlistService
      .addToWishlist(accessory.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setWishlistPending(accessory.id, false);
          this.flashWishlistAdded(accessory.id);
          this.wishlistIds.update(wishlistIds => [...wishlistIds, accessory.id]);
        },
        error: (err: HttpErrorResponse) => {
          this.setWishlistPending(accessory.id, false);
          console.error('Failed to add to wishlist:', err);
        }
      });
    }
  }

  private setWishlistPending(id: number, pending: boolean): void {
    const next = new Set(this.pendingWishlistIds());
    if (pending) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.pendingWishlistIds.set(next);
  }

  private flashWishlistAdded(id: number): void {
    this.addedWishlistId.set(id);
    if (this.addedWishlistTimeout) {
      clearTimeout(this.addedWishlistTimeout);
    }
    this.addedWishlistTimeout = setTimeout(() => this.addedWishlistId.set(null), 2000);
  }

  private loadWishlistIds(): void {
      this.wishlistService.getMyWishlist().subscribe({
        next: (wishlist) => {
          const items = wishlist?.items ?? [];
          const newIds = items.map(item => item.accessory.id);
          this.wishlistIds.set(newIds);
          console.log(this.wishlistIds().length);
          console.log(this.wishlistSet().size);
        },
        error: (err) => {
          console.log('Error loading wishlist ids.', err);
        }
      });
  }

  private removeByValue(value: number): void {
    this.wishlistIds.update(numbers => numbers.filter(num => num !== value));
  }

  loadCategoryAndAccessories(id: number): void {
    this.state.set('loading');
    this.errorMessage = null;

    forkJoin({
      category: this.categoryService.getCategoryById(id),
      accessoriesPage: this.categoryService.getAllRelatedAccessories(id)
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (this.state() === 'loading') {
            this.state.set('loaded');
          }
        })
      )
      .subscribe({
        next: ({ category, accessoriesPage }) => {
          this.category = category;
          this.accessories = accessoriesPage.content || [];
          this.applyFilters();
          this.state.set(this.accessories.length === 0 ? 'empty' : 'loaded');
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
      this.errorMessage = 'Failed to load category accessories. Please try again later.';
    }
  }

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

  private applyFilters(): void {
    let result = [...this.accessories];

    if (this.searchQuery) {
      result = result.filter(item =>
        item.title.toLowerCase().includes(this.searchQuery) ||
        item.description.toLowerCase().includes(this.searchQuery) ||
        item.productCode.toLowerCase().includes(this.searchQuery)
      );
    }

    switch (this.sortOption) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    this.displayedAccessories = result;
  }

  getStockLabel(stock: number): { text: string; variant: 'in' | 'low' | 'out' } {
    if (stock <= 0) return { text: 'Out of stock', variant: 'out' };
    if (stock <= 5) return { text: 'Low stock', variant: 'low' };
    return { text: 'In stock', variant: 'in' };
  }

  goBack(): void {
    this.location.back();
  }

  navigateToAccessory(accessoryId: number): void {
    this.router.navigate(['/accessories', accessoryId]);
  }

  trackById(index: number, item: AccessoryResponse): number {
    return item.id;
  }
}