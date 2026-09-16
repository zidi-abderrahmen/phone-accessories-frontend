import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CategoryService } from '../../core/services/category/category.service';
import { AccessoryService } from '../../core/services/accessory/accessory.service';
import { CartService } from '../../core/services/cart/cart.service';

import { CategoryResponse } from '../../core/models/category/category-response';
import { AccessoryResponse } from '../../core/models/accessory/accessory-response';
import { CartItemRequest } from '../../core/models/cart/items/cart-item-request';
import { RegisterResponse } from '../../core/models/user/register/register.response';
import { UserService } from '../../core/services/user/user.service';
import { Navbar } from "../../shared/components/navbar/navbar";
import { Footer } from "../../shared/components/footer/footer";
import { WishlistFacadeService } from '../../core/services/wishlist-facade/wishlist-facade.service';

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
  protected readonly wishlist = inject(WishlistFacadeService);
  private readonly userService = inject(UserService);
  protected readonly router = inject(Router);
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

  ngOnInit(): void {
    this.loadCategories();
    this.loadAccessories();
    this.wishlist.load();

    this.userService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => this.currentUser.set(user));
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