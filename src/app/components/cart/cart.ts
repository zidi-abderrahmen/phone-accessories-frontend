import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartService } from '../../core/services/cart/cart.service';
import { CartResponse } from '../../core/models/cart/cart-response';
import { CartItemResponse } from '../../core/models/cart/items/cart-item-response';
import { RegisterResponse } from '../../core/models/user/register/register.response';
import { UserService } from '../../core/services/user/user.service';
import { Navbar } from "../../shared/components/navbar/navbar";

type LoadState = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar],
  templateUrl: './cart.html',
  styleUrl: './cart.scss'
})
export class Cart implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cart = signal<CartResponse | null>(null);
  protected readonly cartState = signal<LoadState>('loading');
  protected readonly actionError = signal<string | null>(null);

  // Per-row in-flight state, keyed by cart item id
  protected readonly pendingItemIds = signal<ReadonlySet<number>>(new Set());
  protected readonly stockWarningItemId = signal<number | null>(null);

  protected readonly isClearing = signal(false);
  protected readonly confirmingClear = signal(false);

  protected readonly items = computed<CartItemResponse[]>(() => this.cart()?.cartItems ?? []);
  protected readonly isEmpty = computed(() => this.cartState() === 'loaded' && this.items().length === 0);

  protected readonly totalItems = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  protected readonly subtotal = computed(() =>
    this.items().reduce((sum, item) => sum + item.accessoryResponse.price * item.quantity, 0)
  );

  // No tax/shipping fields exist on any provided model — the estimated
  // total mirrors the subtotal until checkout can compute those.
  protected readonly estimatedTotal = computed(() => this.subtotal());

  // Nav-only state, same pattern as the other pages
  protected readonly currentUser = signal<RegisterResponse | null>(null);
  protected readonly isDarkTheme = signal(false);

  private stockWarningTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly initials = () => {
    const u = this.currentUser();
    if (!u) return '';
    return `${u.firstName?.charAt(0) ?? ''}${u.lastName?.charAt(0) ?? ''}`.toUpperCase();
  };

  ngOnInit(): void {
    this.loadCart();

    this.userService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => this.currentUser.set(user));
  }

  protected loadCart(): void {
    this.cartState.set('loading');
    this.actionError.set(null);

    this.cartService
      .getMyCart()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cart) => {
          this.cart.set(cart);
          this.cartState.set('loaded');
        },
        error: () => this.cartState.set('error')
      });
  }

  protected isPending(item: CartItemResponse): boolean {
    return this.pendingItemIds().has(item.id);
  }

  protected canDecrease(item: CartItemResponse): boolean {
    return item.quantity > 1 && !this.isPending(item);
  }

  protected canIncrease(item: CartItemResponse): boolean {
    return item.quantity < item.accessoryResponse.stock && !this.isPending(item);
  }

  protected decreaseQuantity(item: CartItemResponse): void {
    if (!this.canDecrease(item)) {
      return;
    }
    this.updateQuantity(item, item.quantity - 1);
  }

  protected increaseQuantity(item: CartItemResponse): void {
    if (this.isPending(item)) {
      return;
    }
    if (item.quantity >= item.accessoryResponse.stock) {
      this.flashStockWarning(item.id);
      return;
    }
    this.updateQuantity(item, item.quantity + 1);
  }

  private updateQuantity(item: CartItemResponse, newQuantity: number): void {
    this.setPending(item.id, true);
    this.actionError.set(null);

    this.cartService
      .updateItemInCart(item.id, { newQuantity })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.setPending(item.id, false);
          this.replaceItem(updated);
        },
        error: (err: HttpErrorResponse) => {
          this.setPending(item.id, false);
          if (err.status === 400 || err.status === 409) {
            this.flashStockWarning(item.id);
          } else {
            this.actionError.set(this.extractErrorMessage(err));
          }
        }
      });
  }

  protected removeItem(item: CartItemResponse): void {
    this.setPending(item.id, true);
    this.actionError.set(null);

    this.cartService
      .removeItemFromCart(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setPending(item.id, false);
          const current = this.cart();
          if (!current) return;
          this.cart.set({
            ...current,
            cartItems: current.cartItems.filter((i) => i.id !== item.id)
          });
        },
        error: (err: HttpErrorResponse) => {
          this.setPending(item.id, false);
          this.actionError.set(this.extractErrorMessage(err));
        }
      });
  }

  protected requestClearCart(): void {
    this.confirmingClear.set(true);
  }

  protected cancelClearCart(): void {
    this.confirmingClear.set(false);
  }

  protected confirmClearCart(): void {
    this.isClearing.set(true);
    this.actionError.set(null);

    this.cartService
      .clearCart()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isClearing.set(false);
          this.confirmingClear.set(false);
          const current = this.cart();
          if (current) {
            this.cart.set({ ...current, cartItems: [] });
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isClearing.set(false);
          this.confirmingClear.set(false);
          this.actionError.set(this.extractErrorMessage(err));
        }
      });
  }

  protected dismissActionError(): void {
    this.actionError.set(null);
  }

  private replaceItem(updated: CartItemResponse): void {
    const current = this.cart();
    if (!current) return;
    this.cart.set({
      ...current,
      cartItems: current.cartItems.map((i) => (i.id === updated.id ? updated : i))
    });
  }

  private setPending(id: number, pending: boolean): void {
    const next = new Set(this.pendingItemIds());
    if (pending) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.pendingItemIds.set(next);
  }

  private flashStockWarning(itemId: number): void {
    this.stockWarningItemId.set(itemId);
    if (this.stockWarningTimeout) {
      clearTimeout(this.stockWarningTimeout);
    }
    this.stockWarningTimeout = setTimeout(() => {
      this.stockWarningItemId.set(null);
    }, 2500);
  }

  private extractErrorMessage(err: HttpErrorResponse): string {
    const backendMessage = (err.error as { message?: string } | null)?.message;
    if (backendMessage) {
      return backendMessage;
    }
    return 'Something went wrong while updating your cart. Please try again.';
  }
}