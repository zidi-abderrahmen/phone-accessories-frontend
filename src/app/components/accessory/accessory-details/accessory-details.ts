import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AccessoryResponse } from '../../../core/models/accessory/accessory-response';
import { AccessoryService } from '../../../core/services/accessory/accessory.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { CartService } from '../../../core/services/cart/cart.service';
import { CartItemRequest } from '../../../core/models/cart/items/cart-item-request';
import { UserService } from '../../../core/services/user/user.service';
import { WishlistService } from '../../../core/services/wishlist/wishlist.service';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type PageState = 'loading' | 'loaded' | 'not-found' | 'error';

@Component({
  selector: 'app-accessories-details',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './accessory-details.html',
  styleUrl: './accessory-details.scss',
})
export class AccessoriesDetails implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly accessoryService = inject(AccessoryService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);
  private readonly destroy$ = new Subject<void>();
  private readonly destroyRef = inject(DestroyRef);

  state = signal<PageState>('loading');
  accessory: AccessoryResponse | null = null;
  accessoryId: number | null = null;
  errorMessage: string | null = null;

  isAuthenticated = signal(false);

  // Add-to-cart feedback state
  addingToCart = signal(false);
  addedToCart = signal(false);
  private addedToCartTimeout: ReturnType<typeof setTimeout> | null = null;

  // Add-to-wishlist feedback state.
  // NOTE: WishlistService only exposes addToWishlist(accessoryId) /
  // removeFromWishlist(wishlistItemId) — since we don't have the
  // wishlist item's own id here, this button is a one-shot "add" action
  // with transient confirmation, not a persistent toggle.
  protected readonly addingToWishlist = signal(false);
  protected readonly addedToWishlist = signal(false);
  private addedToWishlistTimeout: ReturnType<typeof setTimeout> | null = null;
  protected wishlistIds = signal<number[]>([]);
  protected readonly wishlistSet = computed(() => new Set(this.wishlistIds()));

  ngOnInit(): void {
    this.extractAccessoryId();
    this.loadWishlistIds();

    this.userService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => this.isAuthenticated.set(!!user));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.addedToCartTimeout) {
      clearTimeout(this.addedToCartTimeout);
    }
    if (this.addedToWishlistTimeout) {
      clearTimeout(this.addedToWishlistTimeout);
    }
  }

  private extractAccessoryId(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const idParam = params.get('id');
        const id = idParam ? parseInt(idParam, 10) : NaN;

        if (!idParam || isNaN(id)) {
          this.state.set('not-found');
          this.errorMessage = 'Invalid accessory identifier.';
          return;
        }

        this.accessoryId = id;
        this.loadAccessory(id);
      });
  }

  loadAccessory(id: number): void {
    this.state.set('loading');
    this.errorMessage = null;

    this.accessoryService
      .getAccessoryById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (accessory) => {
          this.accessory = accessory;
          this.state.set('loaded');
        },
        error: (err) => {
          this.handleLoadError(err);
        },
      });
  }

  private handleLoadError(err: any): void {
    if (err.status === 404) {
      this.state.set('not-found');
      this.errorMessage = 'The accessory you are looking for does not exist.';
    } else if (err.status === 0) {
      this.state.set('error');
      this.errorMessage =
        'Unable to connect to the server. Please check your connection.';
    } else if (err.error?.message) {
      this.state.set('error');
      this.errorMessage = err.error.message;
    } else {
      this.state.set('error');
      this.errorMessage =
        'Failed to load accessory details. Please try again later.';
    }
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  buyNow(): void {
    if (this.accessoryId == null) return;
    const cartItem: CartItemRequest = {
      accessoryId: this.accessoryId,
      quantity: 1
    };
    this.cartService.addItemToCart(cartItem).subscribe({
      next: () => {
        this.router.navigate(['/checkout']);
      },
      error: (err: HttpErrorResponse) => {
        console.log('Error buy this accessory', err);
      }
    });
  }

  addToCart(): void {
    if (!this.accessory || this.accessory.stock <= 0 || this.addingToCart()) {
      return;
    }

    // Cart endpoints require an authenticated session — send anonymous
    // shoppers to log in instead of firing a request that will 401.
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.addingToCart.set(true);

    const payload: CartItemRequest = {
      accessoryId: this.accessory.id,
      quantity: 1,
    };

    this.cartService
      .addItemToCart(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.addingToCart.set(false);
          this.flashAdded();
        },
        error: (err) => {
          this.addingToCart.set(false);
          // TODO: surface this through a shared toast/alert pattern once
          // one exists in the design system — for now it's logged so the
          // failure isn't silent.
          console.error('Failed to add to cart:', err);
        },
      });
  }

  private flashAdded(): void {
    this.addedToCart.set(true);
    if (this.addedToCartTimeout) {
      clearTimeout(this.addedToCartTimeout);
    }
    this.addedToCartTimeout = setTimeout(() => this.addedToCart.set(false), 2000);
  }

  addToWishlist(): void {
    if (!this.accessory || this.addingToWishlist()) {
      return;
    }

    if (!this.isAuthenticated()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.addingToWishlist.set(true);

    if (this.wishlistSet().has(this.accessory.id)) {
      this.wishlistService.removeFromWishlist(this.accessory.id).subscribe({
        next: () => {
          this.addedToWishlist.set(false);
          this.removeByValue(this.accessoryId);
          this.addingToWishlist.set(false);
          console.log(this.wishlistIds().length);
          console.log(this.wishlistSet().size);
        },
        error: (err: HttpErrorResponse) => {
          this.addingToWishlist.set(false);
          console.error('Failed to remove from wishlist:', err);
        }
      });
    } else {
      this.wishlistService
      .addToWishlist(this.accessory.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.addedToWishlist.set(true);
          this.flashWishlistAdded();
          this.addingToWishlist.set(false);
          this.wishlistIds.update(wishlistIds => [...wishlistIds, this.accessoryId || -1]);
          console.log(this.wishlistIds().length);
          console.log(this.wishlistSet().size);
        },
        error: (err: HttpErrorResponse) => {
          this.addingToWishlist.set(false);
          console.error('Failed to add to wishlist:', err);
        }
      });
    }
  }

  private flashWishlistAdded(): void {
    this.addedToWishlist.set(true);
    if (this.addedToWishlistTimeout) {
      clearTimeout(this.addedToWishlistTimeout);
    }
    this.addedToWishlistTimeout = setTimeout(() => this.addedToWishlist.set(false), 2000);
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

  private removeByValue(value: number | null): void {
    if (value == null) return;
    this.wishlistIds.update(numbers => numbers.filter(num => num !== value));
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  getStockLabel(stock: number): { text: string; variant: 'in' | 'low' | 'out' } {
    if (stock <= 0) return { text: 'Out of stock', variant: 'out' };
    if (stock <= 5) return { text: 'Low stock', variant: 'low' };
    return { text: 'In stock', variant: 'in' };
  }

  goBack(): void {
    this.location.back();
  }
}