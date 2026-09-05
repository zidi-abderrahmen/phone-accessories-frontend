import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal, computed, DestroyRef } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AccessoryResponse } from '../../../core/models/accessory/accessory-response';
import { CategoryResponse } from '../../../core/models/category/category-response';
import { Page } from '../../../core/models/page';
import { AccessoryService } from '../../../core/services/accessory/accessory.service';
import { CategoryService } from '../../../core/services/category/category.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { FormsModule } from '@angular/forms';
import { SearchRequest } from '../../../core/models/accessory/search/search-request';
import { UserService } from '../../../core/services/user/user.service';
import { WishlistService } from '../../../core/services/wishlist/wishlist.service';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Navbar } from "../../../shared/components/navbar/navbar";
import { Footer } from "../../../shared/components/footer/footer";

@Component({
  selector: 'app-accessories',
  standalone: true,
  imports: [RouterModule, CurrencyPipe, CommonModule, FormsModule, Navbar, Footer],
  templateUrl: './accessories.html',
  styleUrl: './accessories.scss',
})
export class Accessories implements OnInit {
  private accessoryService = inject(AccessoryService);
  private categoryService = inject(CategoryService);
  private wishlistService = inject(WishlistService);
  private router = inject(Router);
  private activateRoute = inject(ActivatedRoute);
  authService = inject(AuthService);
  userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  // Data state
  accessories = signal<AccessoryResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);
  page: Page<AccessoryResponse> | null = null;

  // Pagination state
  currentPage = 0;
  pageSize = 12;
  totalElements = 0;
  totalPages = 0;

  // Filter state (server-side)
  searchQuery = signal('');
  selectedCategoryId = signal<number | null>(null);
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  inStockOnly = signal<boolean | null>(null);

  // UI state
  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Delete modal state
  showDeleteModal = false;
  accessoryToDelete: AccessoryResponse | null = null;
  deleting = signal(false);

  protected readonly pendingWishlistIds = signal<ReadonlySet<number>>(new Set());
  protected readonly addedWishlistId = signal<number | null>(null);
  private addedWishlistTimeout: ReturnType<typeof setTimeout> | null = null;
  protected wishlistIds = signal<number[]>([]);
  protected readonly wishlistSet = computed(() => new Set(this.wishlistIds()));

  // Computed: are any filters active?
  hasActiveFilters = computed(() =>
    !!this.searchQuery() ||
    this.selectedCategoryId() !== null ||
    this.minPrice() !== null ||
    this.maxPrice() !== null ||
    this.inStockOnly() !== null
  );

  ngOnInit(): void {
    this.loadCategories();
    this.loadWishlistIds();

    const keyword = this.activateRoute.snapshot.queryParams['keyword'];
    if (keyword) {
      this.searchQuery.set(String(keyword).trim());
    }

    this.search(0);
  }

  private loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (response) => {
        const categories = Array.isArray(response) ? response : response.content ?? [];
        this.categories.set(categories);
      },
      error: () => {
        // Silently ignore — not critical enough to block the page
      },
    });
  }

  // Central method: runs the server-side search with current filter state
  search(page: number = 0): void {
    this.loading.set(true);
    this.clearMessages();

    const request: SearchRequest = {
      categoryId: this.selectedCategoryId(),
      keyword: this.searchQuery() || null,
      minPrice: this.minPrice(),
      maxPrice: this.maxPrice(),
      inStock: this.inStockOnly(),
    };

    this.accessoryService.searchAccessories(request, page, this.pageSize).subscribe({
      next: (response) => {
        this.page = response;
        this.accessories.set(response.content);
        this.currentPage = response.pageNumber ?? 0;
        this.pageSize = response.size;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Failed to load accessories. Please try again later.');
      },
    });
  }

  // ── Explicit filter setters (NO auto-search) ──

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value.trim());
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId.set(categoryId ? Number(categoryId) : null);
  }

  onMinPriceChange(value: string): void {
    this.minPrice.set(value ? Number(value) : null);
  }

  onMaxPriceChange(value: string): void {
    this.maxPrice.set(value ? Number(value) : null);
  }

  onInStockChange(checked: boolean): void {
    this.inStockOnly.set(checked ? true : null);
  }

  // ── Explicit actions ──

  /** Triggered only by the Search button */
  onSearchClick(): void {
    this.search(0);
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.selectedCategoryId.set(null);
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.inStockOnly.set(null);
    this.search(0);
  }

  // ── Navigation & CRUD ──

  viewAccessory(accessory: AccessoryResponse): void {
    this.router.navigate(['/accessories', accessory.id]);
  }

  editAccessory(event: Event, accessory: AccessoryResponse): void {
    event.stopPropagation();
    this.router.navigate(['/admin/accessories/edit', accessory.id]);
  }

  confirmDelete(event: Event, accessory: AccessoryResponse): void {
    event.stopPropagation();
    this.accessoryToDelete = accessory;
    this.showDeleteModal = true;
    this.clearMessages();
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.accessoryToDelete = null;
  }

  deleteAccessory(): void {
    if (!this.accessoryToDelete) return;

    this.deleting.set(true);
    this.clearMessages();

    this.accessoryService.deleteAccessory(this.accessoryToDelete.id).subscribe({
      next: () => {
        const title = this.accessoryToDelete!.title;
        this.successMessage.set(`Accessory "${title}" deleted successfully.`);
        this.closeDeleteModal();

        const remainingOnPage = this.accessories().length - 1;
        if (remainingOnPage === 0 && this.currentPage > 0) {
          this.search(this.currentPage - 1);
        } else {
          this.search(this.currentPage);
        }
      },
      error: (err) => {
        this.deleting.set(false);
        if (err.status === 403) {
          this.errorMessage.set('You do not have permission to delete this accessory.');
        } else if (err.status === 404) {
          this.errorMessage.set('Accessory not found. It may have already been deleted.');
          this.closeDeleteModal();
          this.search(this.currentPage);
        } else {
          this.errorMessage.set('Failed to delete accessory. Please try again later.');
        }
      },
    });
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.search(page);
    }

    const targetPage = Number(page); 
    
    if (
      !this.loading() && // Prevent triggers if currently fetching
      targetPage >= 0 && 
      targetPage < this.totalPages && 
      targetPage !== this.currentPage
    ) {
      this.search(page);
    }
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
          console.log(this.wishlistIds().length);
          console.log(this.wishlistSet().size);
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
          console.log(this.wishlistIds().length);
          console.log(this.wishlistSet().size);
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

  getStockLabel(stock: number): { text: string; variant: 'in' | 'low' | 'out' } {
    if (stock <= 0) return { text: 'Out of stock', variant: 'out' };
    if (stock <= 5) return { text: 'Low stock', variant: 'low' };
    return { text: 'In stock', variant: 'in' };
  }

  private closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.accessoryToDelete = null;
    this.deleting.set(false);
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }
}