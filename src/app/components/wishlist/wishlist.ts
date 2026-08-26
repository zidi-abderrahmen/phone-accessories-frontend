import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { WishlistService } from '../../core/services/wishlist/wishlist.service';
import { WishlistItemResponse } from '../../core/models/wishlist/items/wishlist-item-response';
import { CartService } from '../../core/services/cart/cart.service';
import { CartItemRequest } from '../../core/models/cart/items/cart-item-request';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Wishlist implements OnInit {
  private readonly wishlistService = inject(WishlistService);
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly items = signal<WishlistItemResponse[]>([]);

  readonly isClearing = signal(false);
  readonly processingItemId = signal<number | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly hasItems = computed(() => this.items().length > 0);

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.wishlistService.getMyWishlist().subscribe({
      next: (wishlist) => {
        this.items.set(wishlist?.items ?? []);
        this.isLoading.set(false);
        console.log(this.items.length);
        
      },
      error: () => {
        this.loadError.set('We couldn’t load your wishlist. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  // ---------------------------------------------------------------------
  // Remove / clear
  // ---------------------------------------------------------------------
  removeItem(item: WishlistItemResponse): void {
    if (this.processingItemId() !== null) return;

    this.actionError.set(null);
    this.processingItemId.set(item.accessory.id);

    this.wishlistService.removeFromWishlist(item.accessory.id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((i) => i.accessory.id !== item.accessory.id));
        this.processingItemId.set(null);
      },
      error: () => {
        this.actionError.set('Couldn’t remove this item. Please try again.');
        this.processingItemId.set(null);
      },
    });
  }

  clearWishlist(): void {
    if (this.isClearing() || !this.hasItems()) return;

    this.actionError.set(null);
    this.isClearing.set(true);

    this.wishlistService.clearWishlist().subscribe({
      next: () => {
        this.items.set([]);
        this.isClearing.set(false);
      },
      error: () => {
        this.actionError.set('Couldn’t clear your wishlist. Please try again.');
        this.isClearing.set(false);
      },
    });
  }

  // ---------------------------------------------------------------------
  // Cart actions
  // ---------------------------------------------------------------------
  addToCart(item: WishlistItemResponse): void {
    const cartItem: CartItemRequest = {
      accessoryId: item.accessory.id,
      quantity: 1
    };
    this.cartService.addItemToCart(cartItem).subscribe({
      error: () => {
        this.actionError.set('Couldn’t add this accessory to the cart. Please try again.');
      }
    })
  }

  buyNow(item: WishlistItemResponse): void {
    const cartItem: CartItemRequest = {
      accessoryId: item.accessory.id,
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

  // ---------------------------------------------------------------------
  // Display helpers
  // ---------------------------------------------------------------------
  accessoryImage(item: WishlistItemResponse): string {
    return (item.accessory as any)?.imageUrl ?? '';
  }

  accessoryTitle(item: WishlistItemResponse): string {
    return (item.accessory as any)?.name ?? 'Product';
  }

  accessoryCategory(item: WishlistItemResponse): string {
    const category = (item.accessory as any)?.category;
    return typeof category === 'string' ? category : category?.name ?? '';
  }

  accessoryPrice(item: WishlistItemResponse): number {
    return (item.accessory as any)?.price ?? 0;
  }

  accessoryId(item: WishlistItemResponse): number {
    return (item.accessory as any)?.id ?? item.id;
  }

  isInStock(item: WishlistItemResponse): boolean {
    const accessory = item.accessory as any;
    if (typeof accessory?.inStock === 'boolean') return accessory.inStock;
    if (typeof accessory?.stockQuantity === 'number') return accessory.stockQuantity > 0;
    if (typeof accessory?.stock === 'number') return accessory.stock > 0;
    return true;
  }

  trackByItemId(_index: number, item: WishlistItemResponse): number {
    return item.id;
  }
}