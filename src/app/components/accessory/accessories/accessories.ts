import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs';

import { AccessoryResponse } from '../../../core/models/accessory/accessory-response';
import { CategoryResponse } from '../../../core/models/category/category-response';
import { SearchRequest } from '../../../core/models/accessory/search/search-request';
import { CartItemRequest } from '../../../core/models/cart/items/cart-item-request';
import { AccessoryService } from '../../../core/services/accessory/accessory.service';
import { CategoryService } from '../../../core/services/category/category.service';
import { CartService } from '../../../core/services/cart/cart.service';
import { UserService } from '../../../core/services/user/user.service';
import { WishlistFacadeService } from '../../../core/services/wishlist-facade/wishlist-facade.service';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { AccessoryCard } from '../../../shared/components/accessory-card/accessory-card';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest' },
  { value: 'price,asc', label: 'Price: Low to High' },
  { value: 'price,desc', label: 'Price: High to Low' },
  { value: 'title,asc', label: 'Name: A to Z' },
] as const;

@Component({
  selector: 'app-accessories',
  standalone: true,
  imports: [RouterLink, FormsModule, Navbar, Footer, AccessoryCard],
  templateUrl: './accessories.html',
  styleUrl: './accessories.scss',
})
export class Accessories implements OnInit {
  private readonly accessoryService = inject(AccessoryService);
  private readonly categoryService = inject(CategoryService);
  private readonly cartService = inject(CartService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly wishlist = inject(WishlistFacadeService);
  protected readonly isAdmin = computed(() => this.userService.hasAnyRole(['SUPER_ADMIN', 'ADMIN']));

  // ---------------------------------------------------------------------
  // Data state
  // ---------------------------------------------------------------------
  protected readonly accessories = signal<AccessoryResponse[]>([]);
  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly state = signal<LoadState>('idle');
  protected readonly isEmpty = computed(() => this.state() === 'loaded' && this.accessories().length === 0);

  // Pagination state
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly pageSize = PAGE_SIZE;

  // Filter state (server-side)
  protected readonly searchQuery = signal('');
  protected readonly selectedCategoryId = signal<number | null>(null);
  protected readonly minPrice = signal<number | null>(null);
  protected readonly maxPrice = signal<number | null>(null);
  protected readonly inStockOnly = signal<boolean | null>(null);
  protected readonly sortOption = signal<string>(SORT_OPTIONS[0].value);
  protected readonly sortOptions = SORT_OPTIONS;

  protected readonly hasActiveFilters = computed(
    () =>
      !!this.searchQuery() ||
      this.selectedCategoryId() !== null ||
      this.minPrice() !== null ||
      this.maxPrice() !== null ||
      this.inStockOnly() !== null,
  );

  // Notifications
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  // Delete modal state
  protected readonly showDeleteModal = signal(false);
  protected readonly accessoryToDelete = signal<AccessoryResponse | null>(null);
  protected readonly deleting = signal(false);

  // Cart feedback state (mirrors Home)
  protected readonly pendingCartIds = signal<ReadonlySet<number>>(new Set());
  protected readonly addedCartId = signal<number | null>(null);
  protected readonly cartAnnouncement = signal('');

  ngOnInit(): void {
    this.loadCategories();
    this.wishlist.load();

    // Reactive navbar search: the navbar writes ?keyword= on the URL and
    // this subscription is the single source of truth for reacting to it —
    // on first load AND on every subsequent search triggered from the
    // navbar while already on this page. distinctUntilChanged prevents a
    // duplicate request when the query params fire but the keyword itself
    // hasn't actually changed (e.g. other query params changing later).
    this.route.queryParams
      .pipe(
        map((params) => (params['keyword'] ?? '').toString().trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((keyword) => {
        this.searchQuery.set(keyword);
        this.search(0);
      });
  }

  private loadCategories(): void {
    this.categoryService
      .getAllCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const categories = Array.isArray(response) ? response : (response.content ?? []);
          this.categories.set(categories);
        },
      });
  }

  // ---------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------
  protected search(page = 0): void {
    this.state.set('loading');
    this.clearMessages();

    const request: SearchRequest = {
      categoryId: this.selectedCategoryId(),
      keyword: this.searchQuery() || null,
      minPrice: this.minPrice(),
      maxPrice: this.maxPrice(),
      inStock: this.inStockOnly(),
    };

    this.accessoryService
      .searchAccessories(request, page, this.pageSize, this.sortOption())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.accessories.set(response.content);
          this.currentPage.set(response.number ?? 0);
          this.totalElements.set(response.totalElements);
          this.totalPages.set(response.totalPages);
          this.state.set('loaded');
        },
        error: () => {
          this.state.set('error');
        },
      });
  }

  // ── Explicit filter setters (no auto-search — Search button commits them) ──

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value.trim());
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  protected onCategoryChange(categoryId: string): void {
    this.selectedCategoryId.set(categoryId ? Number(categoryId) : null);
  }

  protected onMinPriceChange(value: string): void {
    this.minPrice.set(value ? Number(value) : null);
  }

  protected onMaxPriceChange(value: string): void {
    this.maxPrice.set(value ? Number(value) : null);
  }

  protected onInStockChange(checked: boolean): void {
    this.inStockOnly.set(checked ? true : null);
  }

  // Sorting is immediate — it's a display preference, not a filter commit.
  protected onSortChange(value: string): void {
    this.sortOption.set(value);
    this.search(0);
  }

  /** Triggered by the search form submit (button click or Enter). */
  protected onSearchClick(): void {
    this.search(0);
  }

  protected clearAllFilters(): void {
    this.searchQuery.set('');
    this.selectedCategoryId.set(null);
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.inStockOnly.set(null);
    this.search(0);
  }

  // ---------------------------------------------------------------------
  // Cart
  // ---------------------------------------------------------------------
  protected isCartPending(accessory: AccessoryResponse): boolean {
    return this.pendingCartIds().has(accessory.id);
  }

  protected addToCart(accessory: AccessoryResponse): void {
    if (this.isCartPending(accessory) || accessory.stock <= 0) return;

    this.pendingCartIds.update((set) => new Set(set).add(accessory.id));

    const cartItem: CartItemRequest = {
      accessoryId: accessory.id,
      quantity: 1,
    };

    this.cartService
      .addItemToCart(cartItem)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pendingCartIds.update((set) => {
            const next = new Set(set);
            next.delete(accessory.id);
            return next;
          });
          this.addedCartId.set(accessory.id);
          this.cartAnnouncement.set(`${accessory.title} added to cart.`);
          setTimeout(() => {
            if (this.addedCartId() === accessory.id) this.addedCartId.set(null);
          }, 1800);
        },
        error: () => {
          this.pendingCartIds.update((set) => {
            const next = new Set(set);
            next.delete(accessory.id);
            return next;
          });
          this.errorMessage.set('Could not add this accessory to the cart. Please try again.');
          this.cartAnnouncement.set('Failed to add item to cart.');
        },
      });
  }

  // ---------------------------------------------------------------------
  // Wishlist
  // ---------------------------------------------------------------------
  protected onToggleWishlist(event: { event: Event; product: AccessoryResponse }): void {
    this.wishlist.toggle(event.event, event.product, this.router.url);
  }

  // ---------------------------------------------------------------------
  // Admin CRUD
  // ---------------------------------------------------------------------
  protected editAccessory(accessory: AccessoryResponse): void {
    if (!this.isAdmin()) return;
    this.router.navigate(['/admin/accessories/edit', accessory.id]);
  }

  protected confirmDelete(accessory: AccessoryResponse): void {
    if (!this.isAdmin()) return;
    this.accessoryToDelete.set(accessory);
    this.showDeleteModal.set(true);
    this.clearMessages();
  }

  protected cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.accessoryToDelete.set(null);
  }

  protected deleteAccessory(): void {
    const accessory = this.accessoryToDelete();
    if (!accessory) return;

    this.deleting.set(true);
    this.clearMessages();

    this.accessoryService
      .deleteAccessory(accessory.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage.set(`Accessory "${accessory.title}" deleted successfully.`);
          this.closeDeleteModal();

          const remainingOnPage = this.accessories().length - 1;
          if (remainingOnPage === 0 && this.currentPage() > 0) {
            this.search(this.currentPage() - 1);
          } else {
            this.search(this.currentPage());
          }
        },
        error: (err) => {
          this.deleting.set(false);
          if (err.status === 403) {
            this.errorMessage.set('You do not have permission to delete this accessory.');
          } else if (err.status === 404) {
            this.errorMessage.set('Accessory not found. It may have already been deleted.');
            this.closeDeleteModal();
            this.search(this.currentPage());
          } else {
            this.errorMessage.set('Failed to delete accessory. Please try again later.');
          }
        },
      });
  }

  // ---------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------
  protected goToPage(page: number): void {
    const targetPage = Number(page);

    if (
      this.state() !== 'loading' &&
      targetPage >= 0 &&
      targetPage < this.totalPages() &&
      targetPage !== this.currentPage()
    ) {
      this.search(targetPage);
    }
  }

  private closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.accessoryToDelete.set(null);
    this.deleting.set(false);
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }
}