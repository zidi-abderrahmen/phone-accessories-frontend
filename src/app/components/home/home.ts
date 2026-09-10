import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CategoryService } from '../../core/services/category/category.service';
import { AccessoryService } from '../../core/services/accessory/accessory.service';
import { CartService } from '../../core/services/cart/cart.service';
import { WishlistService } from '../../core/services/wishlist/wishlist.service';

import { CategoryResponse } from '../../core/models/category/category-response';
import { AccessoryResponse } from '../../core/models/accessory/accessory-response';
import { CartItemRequest } from '../../core/models/cart/items/cart-item-request';
import { RegisterResponse } from '../../core/models/user/register/register.response';
import { UserService } from '../../core/services/user/user.service';
import { Navbar } from "../../shared/components/navbar/navbar";
import { Footer } from "../../shared/components/footer/footer";

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, Footer],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly accessoryService = inject(AccessoryService);
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly actionError = signal<string | null>(null);

  // Featured categories
  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly categoriesState = signal<LoadState>('idle');
  protected readonly categorySkeletons = Array.from({ length: 6 });

  // Featured accessories
  protected readonly accessories = signal<AccessoryResponse[]>([]);
  protected readonly accessoriesState = signal<LoadState>('idle');
  protected readonly productSkeletons = Array.from({ length: 8 });

  // Auth / theme
  protected readonly currentUser = signal<RegisterResponse | null>(null);
  protected readonly isAuthenticated = computed(() => this.currentUser() !== null);
  protected readonly isDarkTheme = signal(false);

  // Add-to-cart state, keyed by accessory id
  protected readonly pendingCartIds = signal<ReadonlySet<number>>(new Set());
  protected readonly addedCartId = signal<number | null>(null);
  private addedCartTimeout: ReturnType<typeof setTimeout> | null = null;

  // Add-to-wishlist state, keyed by accessory id
  protected readonly pendingWishlistIds = signal<ReadonlySet<number>>(new Set());
  protected readonly addedWishlistId = signal<number | null>(null);
  private addedWishlistTimeout: ReturnType<typeof setTimeout> | null = null;
  protected wishlistIds = signal<number[]>([]);
  protected wishlistSet = computed(() => new Set(this.wishlistIds()));

  ngOnInit(): void {
    this.syncThemeState();
    this.loadCategories();
    this.loadAccessories();
    this.loadWishlistIds();

    this.userService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => this.currentUser.set(user));

    this.userService
      .checkAuth()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected loadCategories(): void {
    this.categoriesState.set('loading');
    this.categoryService
      .getAllCategories(0, 6, 'name,asc')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.categories.set(page.content);
          this.categoriesState.set('loaded');
        },
        error: () => this.categoriesState.set('error')
      });
  }

  protected loadAccessories(): void {
    this.accessoriesState.set('loading');
    this.accessoryService
      .getAllAccessories(0, 8, 'createdAt,desc')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.accessories.set(page.content);
          this.accessoriesState.set('loaded');
        },
        error: () => this.accessoriesState.set('error')
      });
  }

  private syncThemeState(): void {
    this.isDarkTheme.set(document.documentElement.classList.contains('dark-theme'));
  }

  protected isOutOfStock(accessory: AccessoryResponse): boolean {
    return accessory.stock <= 0;
  }

  protected isLowStock(accessory: AccessoryResponse): boolean {
    return accessory.stock > 0 && accessory.stock <= 5;
  }

  protected isNewArrival(accessory: AccessoryResponse): boolean {
    const created = new Date(accessory.createdAt).getTime();
    if (Number.isNaN(created)) {
      return false;
    }
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - created <= THIRTY_DAYS_MS;
  }

  protected isCartPending(accessory: AccessoryResponse): boolean {
    return this.pendingCartIds().has(accessory.id);
  }

  // ---------------------------------------------------------------------
  // Cart actions
  // ---------------------------------------------------------------------
  addToCart(accessory: AccessoryResponse): void {
    const cartItem: CartItemRequest = {
      accessoryId: accessory.id,
      quantity: 1
    };
    this.cartService.addItemToCart(cartItem).subscribe({
      error: () => {
        this.actionError.set('Couldn’t add this accessory to the cart. Please try again.');
      }
    })
  }

  protected isWishlistPending(accessory: AccessoryResponse): boolean {
    return this.pendingWishlistIds().has(accessory.id);
  }

  protected addToWishlist(event: Event, accessory: AccessoryResponse): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.isWishlistPending(accessory)) {
      return;
    }

    if (!this.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } });
      return;
    }

    this.setWishlistPending(accessory.id, true);

    if (this.wishlistSet().has(accessory.id)) {
      this.wishlistService.removeFromWishlist(accessory.id).subscribe({
        next: () => {
          this.setWishlistPending(accessory.id, false);
          this.removeByValue(accessory.id);
        },
        error: () => {
          this.setWishlistPending(accessory.id, false);
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
        error: () => {
          this.setWishlistPending(accessory.id, false);
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
        }
      });
  }

  private removeByValue(value: number): void {
    this.wishlistIds.update(numbers => numbers.filter(num => num !== value));
  }

  protected categoryInitial(category: CategoryResponse): string {
    return category.name?.charAt(0)?.toUpperCase() ?? '?';
  }

  protected onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    const keyword = input.value.trim();
    if (keyword) {
      this.router.navigate(['/accessories'], { queryParams: { keyword } });
    }
  }
}