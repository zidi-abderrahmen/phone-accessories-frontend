import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// NOTE: paths below assume `home.ts` lives at `src/app/pages/home/home.ts`,
// mirroring the `src/app/core/services/**` and `src/app/core/models/**`
// depth used by the other services in this project. Adjust if your actual
// folder structure differs.
//
// The cart service's class is literally named `Cart` (see cart.ts), so the
// import is aliased to `CartService` to avoid any ambiguity in this file.
import { CategoryService } from '../../core/services/category/category.service';
import { AccessoryService } from '../../core/services/accessory/accessory.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { CartService } from '../../core/services/cart/cart.service';

import { CategoryResponse } from '../../core/models/category/category-response';
import { AccessoryResponse } from '../../core/models/accessory/accessory-response';
import { CartItemRequest } from '../../core/models/cart/items/cart-item-request';
import { RegisterResponse } from '../../core/models/user/register/register.response';
import { UserService } from '../../core/services/user/user.service';
import { HttpErrorResponse } from '@angular/common/http';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLinkActive, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly accessoryService = inject(AccessoryService);
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

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

  ngOnInit(): void {
    this.syncThemeState();
    this.loadCategories();
    this.loadAccessories();

    this.userService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => this.currentUser.set(user));

    this.authService
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

  protected toggleTheme(): void {
    const html = document.documentElement;
    const next = !this.isDarkTheme();

    html.classList.toggle('dark-theme', next);
    html.style.colorScheme = next ? 'dark' : 'light';

    try {
      localStorage.setItem('pa-theme', next ? 'dark' : 'light');
    } catch {
      // localStorage unavailable (private mode, SSR, etc.) — theme just won't persist
    }

    this.isDarkTheme.set(next);
  }

  private syncThemeState(): void {
    this.isDarkTheme.set(document.documentElement.classList.contains('dark-theme'));
  }

  protected initials(user: RegisterResponse | null): string {
    if (!user) {
      return '';
    }
    const name = (user as any).fullName ?? (user as any).username ?? (user as any).email ?? '';
    return String(name).trim().charAt(0).toUpperCase();
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

  protected addToCart(event: Event, accessory: AccessoryResponse): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.isOutOfStock(accessory) || this.isCartPending(accessory)) {
      return;
    }

    // Cart endpoints require an authenticated session — send anonymous
    // shoppers to log in instead of firing a request that will 401.
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } });
      return;
    }

    this.setCartPending(accessory.id, true);

    const payload: CartItemRequest = { accessoryId: accessory.id, quantity: 1 };

    this.cartService
      .addItemToCart(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setCartPending(accessory.id, false);
          this.flashAdded(accessory.id);
        },
        error: (err: HttpErrorResponse) => {
          this.setCartPending(accessory.id, false);
          // TODO: surface this through a shared toast/alert pattern once
          // one exists in the design system — for now it's logged so the
          // failure isn't silent.
          console.error('Failed to add to cart:', err);
        }
      });
  }

  private setCartPending(id: number, pending: boolean): void {
    const next = new Set(this.pendingCartIds());
    if (pending) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.pendingCartIds.set(next);
  }

  private flashAdded(id: number): void {
    this.addedCartId.set(id);
    if (this.addedCartTimeout) {
      clearTimeout(this.addedCartTimeout);
    }
    this.addedCartTimeout = setTimeout(() => this.addedCartId.set(null), 2000);
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