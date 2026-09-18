import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CategoryService } from '../../core/services/category/category.service';
import { AccessoryService } from '../../core/services/accessory/accessory.service';
import { CartService } from '../../core/services/cart/cart.service';

import { CategoryResponse } from '../../core/models/category/category-response';
import { AccessoryResponse } from '../../core/models/accessory/accessory-response';
import { CartItemRequest } from '../../core/models/cart/items/cart-item-request';
import { Navbar } from "../../shared/components/navbar/navbar";
import { Footer } from "../../shared/components/footer/footer";
import { WishlistFacadeService } from '../../core/services/wishlist-facade/wishlist-facade.service';
import { AccessoryCard } from '../../shared/components/accessory-card/accessory-card';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, Footer, AccessoryCard],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly accessoryService = inject(AccessoryService);
  private readonly cartService = inject(CartService);
  protected readonly wishlist = inject(WishlistFacadeService);
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

  // Add-to-cart state, keyed by accessory id
  protected readonly pendingCartIds = signal<ReadonlySet<number>>(new Set());
  protected readonly addedCartId = signal<number | null>(null);
  protected readonly cartAnnouncement = signal('');

  // Customer reviews (placeholder scaffold until real review data is available)
  protected readonly testimonials = [
    { author: 'Sarah K.', initials: 'SK', quote: 'The charger case fits perfectly and shipping was way faster than expected.' },
    { author: 'Marco D.', initials: 'MD', quote: 'Great build quality on the earbuds — better than accessories twice the price.' },
    { author: 'Aya B.', initials: 'AB', quote: 'Easy checkout, real-time stock info was accurate, no surprises at delivery.' },
  ];

  // Promo countdown — wired to a real sale-end timestamp from the backend
  // when available; stays hidden (null) until then to avoid a fake countdown.
  protected readonly saleEndsAt = signal<Date | null>(null);
  protected readonly countdown = signal({ hours: 0, minutes: 0, seconds: 0 });
  private countdownInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.loadCategories();
    this.loadAccessories();
    this.wishlist.load();

    if (this.saleEndsAt()) {
      this.startCountdown(this.saleEndsAt()!);
    }
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

  protected isCartPending(accessory: AccessoryResponse): boolean {
    return this.pendingCartIds().has(accessory.id);
  }

  // ---------------------------------------------------------------------
  // Cart actions
  // ---------------------------------------------------------------------
  addToCart(accessory: AccessoryResponse): void {
    if (this.isCartPending(accessory) || accessory.stock <= 0) return;

    this.pendingCartIds.update((set) => new Set(set).add(accessory.id));
    this.actionError.set(null);

    const cartItem: CartItemRequest = {
      accessoryId: accessory.id,
      quantity: 1
    };

    this.cartService.addItemToCart(cartItem).subscribe({
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
        this.actionError.set('Could not add this accessory to the cart. Please try again.');
        this.cartAnnouncement.set('Failed to add item to cart.');
      }
    });
  }

  protected toggleWishlist(event: Event, accessory: AccessoryResponse): void {
    this.wishlist.toggle(event, accessory, this.router.url);
  }

  // ---------------------------------------------------------------------
  // Promo countdown
  // ---------------------------------------------------------------------
  private startCountdown(endsAt: Date): void {
    const tick = () => {
      const diff = Math.max(0, endsAt.getTime() - Date.now());
      this.countdown.set({
        hours: Math.floor(diff / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1000),
      });
    };
    tick();
    this.countdownInterval = setInterval(tick, 1000);
    this.destroyRef.onDestroy(() => clearInterval(this.countdownInterval));
  }

  protected categoryInitial(category: CategoryResponse): string {
    return category.name?.charAt(0)?.toUpperCase() ?? '?';
  }
}