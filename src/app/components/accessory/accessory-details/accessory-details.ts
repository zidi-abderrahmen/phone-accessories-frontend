import {
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AccessoryResponse } from '../../../core/models/accessory/accessory-response';
import { AccessoryService } from '../../../core/services/accessory/accessory.service';
import { CartService } from '../../../core/services/cart/cart.service';
import { CartItemRequest } from '../../../core/models/cart/items/cart-item-request';
import { UserService } from '../../../core/services/user/user.service';
import { ReviewService } from '../../../core/services/review/review.service';
import { ReviewRequest } from '../../../core/models/review/review-request';
import { ReviewResponse } from '../../../core/models/review/review-response';
import { Page } from '../../../core/models/page/page';
import { RegisterResponse } from '../../../core/models/user/register/register.response';
import { WishlistFacadeService } from '../../../core/services/wishlist-facade/wishlist-facade.service';
import { AccessoryCard } from '../../../shared/components/accessory-card/accessory-card';

type PageState = 'loading' | 'loaded' | 'not-found' | 'error';
type ReviewsState = 'idle' | 'loading' | 'loading-more' | 'loaded' | 'error';
type ReviewFormMode = 'create' | 'edit' | null;
type RelatedState = 'idle' | 'loading' | 'loaded' | 'error';

const REVIEWS_PAGE_SIZE = 10;
const REVIEWS_SORT = 'createdAt,desc';
const RELATED_PAGE_SIZE = 4;
const RELATED_SORT = 'createdAt,desc';
const QUANTITY_HARD_CAP = 20;
const CART_FEEDBACK_MS = 2000;
const CART_ERROR_MS = 5000;

@Component({
  selector: 'app-accessories-details',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, AccessoryCard],
  templateUrl: './accessory-details.html',
  styleUrl: './accessory-details.scss',
})
export class AccessoriesDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly accessoryService = inject(AccessoryService);
  private readonly userService = inject(UserService);
  private readonly cartService = inject(CartService);
  protected readonly wishlist = inject(WishlistFacadeService);
  private readonly reviewService = inject(ReviewService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<PageState>('loading');
  readonly accessory = signal<AccessoryResponse | null>(null);
  accessoryId: number | null = null;
  errorMessage: string | null = null;

  readonly isAuthenticated = signal(false);

  // ---------------------------------------------------------------------
  // Quantity stepper
  // ---------------------------------------------------------------------
  readonly quantity = signal(1);
  readonly maxQuantity = computed(() => {
    const stock = this.accessory()?.stock ?? 0;
    return Math.max(1, Math.min(stock, QUANTITY_HARD_CAP));
  });

  // ---------------------------------------------------------------------
  // Add-to-cart feedback state
  // ---------------------------------------------------------------------
  readonly addingToCart = signal(false);
  readonly addedToCart = signal(false);
  readonly cartError = signal<string | null>(null);
  readonly cartAnnouncement = signal('');
  private addedToCartTimeout: ReturnType<typeof setTimeout> | null = null;
  private cartErrorTimeout: ReturnType<typeof setTimeout> | null = null;

  // ---------------------------------------------------------------------
  // Buy Now state
  // ---------------------------------------------------------------------
  readonly buyingNow = signal(false);
  readonly buyNowError = signal<string | null>(null);

  // ---------------------------------------------------------------------
  // Pricing / discount
  // ---------------------------------------------------------------------
  readonly hasDiscount = computed(() => {
    const a = this.accessory();
    return !!a?.originalPrice && a.originalPrice > a.price;
  });

  readonly discountPercent = computed(() => {
    const a = this.accessory();
    if (!a?.originalPrice) return 0;
    return Math.round((1 - a.price / a.originalPrice) * 100);
  });

  // ---------------------------------------------------------------------
  // Reviews
  // ---------------------------------------------------------------------
  protected readonly reviewsState = signal<ReviewsState>('idle');
  protected readonly reviews = signal<ReviewResponse[]>([]);
  protected readonly reviewsPage = signal(0);
  protected readonly reviewsTotalPages = signal(0);
  protected readonly reviewsTotalElements = signal(0);

  protected readonly hasMoreReviews = computed(
    () => this.reviewsPage() + 1 < this.reviewsTotalPages()
  );

  protected readonly reviewCount = computed(
    () => this.reviewsTotalElements() || this.reviews().length
  );

  protected readonly averageRating = computed(() => {
    const list = this.reviews();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, r) => acc + r.rating, 0);
    return sum / list.length;
  });

  protected readonly averageRatingRounded = computed(() =>
    Math.round(this.averageRating() * 10) / 10
  );

  // Phase 1 — prefer backend aggregate values over locally-computed ones.
  // The backend `rating` / `reviewCount` reflect ALL reviews; the computed
  // fallbacks only know about the currently-loaded page.
  readonly displayRating = computed(
    () => this.accessory()?.rating ?? this.averageRatingRounded()
  );

  readonly displayReviewCount = computed(
    () => this.accessory()?.reviewCount ?? this.reviewCount()
  );

  protected readonly hasOwnReview = computed(() => this.reviews().some((r) => r.mine));

  protected readonly ratingStars = [1, 2, 3, 4, 5];

  // Create / edit form state
  protected readonly reviewFormMode = signal<ReviewFormMode>(null);
  protected readonly editingReviewId = signal<number | null>(null);
  protected readonly formRating = signal(0);
  protected readonly hoverRating = signal(0);
  protected formComment = '';
  protected readonly isSubmittingReview = signal(false);
  protected readonly reviewFormError = signal<string | null>(null);

  @ViewChild('reviewForm') private reviewFormRef?: ElementRef<HTMLElement>;
  private reviewFormTrigger: HTMLElement | null = null;

  // Delete confirmation state
  protected readonly reviewPendingDelete = signal<ReviewResponse | null>(null);
  protected readonly isDeletingReview = signal(false);
  protected readonly reviewDeleteError = signal<string | null>(null);
  private deleteTrigger: HTMLElement | null = null;

  // ---------------------------------------------------------------------
  // Related products
  // ---------------------------------------------------------------------
  protected readonly related = signal<AccessoryResponse[]>([]);
  protected readonly relatedState = signal<RelatedState>('idle');
  protected readonly relatedSkeletons = Array.from({ length: 4 });

  // Related-card cart feedback (mirrors the Home page pattern)
  protected readonly pendingRelatedCartIds = signal<ReadonlySet<number>>(new Set());
  protected readonly addedRelatedCartId = signal<number | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.addedToCartTimeout) clearTimeout(this.addedToCartTimeout);
      if (this.cartErrorTimeout) clearTimeout(this.cartErrorTimeout);
    });
  }

  ngOnInit(): void {
    this.extractAccessoryId();
    this.wishlist.load();

    this.userService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => this.isAuthenticated.set(!!user));
  }

  private extractAccessoryId(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const idParam = params.get('id');
      const id = idParam ? parseInt(idParam, 10) : NaN;

      if (!idParam || isNaN(id)) {
        this.state.set('not-found');
        this.errorMessage = 'Invalid accessory identifier.';
        return;
      }

      this.accessoryId = id;
      this.quantity.set(1);
      this.loadAccessory(id);
      this.loadReviews(id, 0);
    });
  }

  loadAccessory(id: number): void {
    this.state.set('loading');
    this.errorMessage = null;

    this.accessoryService
      .getAccessoryById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (accessory) => {
          this.accessory.set(accessory);
          this.quantity.set(1);
          this.state.set('loaded');
          this.loadRelated(accessory);
        },
        error: (err: HttpErrorResponse) => {
          this.handleLoadError(err);
        },
      });
  }

  private handleLoadError(err: HttpErrorResponse): void {
    if (err.status === 404) {
      this.state.set('not-found');
      this.errorMessage = 'The accessory you are looking for does not exist.';
    } else if (err.status === 0) {
      this.state.set('error');
      this.errorMessage = 'Unable to connect to the server. Please check your connection.';
    } else if (err.error?.message) {
      this.state.set('error');
      this.errorMessage = err.error.message;
    } else {
      this.state.set('error');
      this.errorMessage = 'Failed to load accessory details. Please try again later.';
    }
  }

  // ------------------------------------------------------------------
  // Quantity stepper
  // ------------------------------------------------------------------

  increaseQuantity(): void {
    if (this.quantity() < this.maxQuantity()) {
      this.quantity.update((q) => q + 1);
    }
  }

  decreaseQuantity(): void {
    if (this.quantity() > 1) {
      this.quantity.update((q) => q - 1);
    }
  }

  // ------------------------------------------------------------------
  // Cart / wishlist actions
  // ------------------------------------------------------------------

  buyNow(): void {
    const accessory = this.accessory();
    if (!accessory || accessory.stock <= 0 || this.buyingNow()) return;

    if (!this.isAuthenticated()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.buyingNow.set(true);
    this.buyNowError.set(null);

    const cartItem: CartItemRequest = {
      accessoryId: accessory.id,
      quantity: this.quantity(),
    };

    this.cartService
      .addItemToCart(cartItem)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigate(['/checkout']);
        },
        error: () => {
          this.buyingNow.set(false);
          this.buyNowError.set('Could not start checkout. Please try again.');
        },
      });
  }

  addToCart(): void {
    const accessory = this.accessory();
    if (!accessory || accessory.stock <= 0 || this.addingToCart()) return;

    if (!this.isAuthenticated()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.addingToCart.set(true);
    this.cartError.set(null);

    const payload: CartItemRequest = {
      accessoryId: accessory.id,
      quantity: this.quantity(),
    };

    this.cartService
      .addItemToCart(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.addingToCart.set(false);
          this.flashAdded(accessory);
        },
        error: () => {
          this.addingToCart.set(false);
          this.showCartError('Could not add this item to the cart. Please try again.');
        },
      });
  }

  private flashAdded(accessory: AccessoryResponse): void {
    this.addedToCart.set(true);
    this.cartAnnouncement.set(
      `${accessory.title} (quantity ${this.quantity()}) added to cart.`
    );
    if (this.addedToCartTimeout) clearTimeout(this.addedToCartTimeout);
    this.addedToCartTimeout = setTimeout(
      () => this.addedToCart.set(false),
      CART_FEEDBACK_MS
    );
  }

  private showCartError(message: string): void {
    this.cartError.set(message);
    this.cartAnnouncement.set('Failed to add item to cart.');
    if (this.cartErrorTimeout) clearTimeout(this.cartErrorTimeout);
    this.cartErrorTimeout = setTimeout(() => this.cartError.set(null), CART_ERROR_MS);
  }

  // ------------------------------------------------------------------
  // Related products
  // ------------------------------------------------------------------

  private loadRelated(accessory: AccessoryResponse): void {
    if (!accessory.category) {
      this.related.set([]);
      this.relatedState.set('loaded');
      return;
    }

    this.relatedState.set('loading');

    this.accessoryService
      .searchAccessories(
        {
          categoryId: accessory.category.id,
          keyword: null,
          minPrice: null,
          maxPrice: null,
          inStock: null,
        },
        0,
        RELATED_PAGE_SIZE,
        RELATED_SORT
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          // Exclude the current accessory — request size is PAGE_SIZE + 0,
          // so filtering keeps at most RELATED_PAGE_SIZE items.
          this.related.set(page.content.filter((item) => item.id !== accessory.id));
          this.relatedState.set('loaded');
        },
        error: () => this.relatedState.set('error'),
      });
  }

  retryLoadRelated(): void {
    const accessory = this.accessory();
    if (accessory) this.loadRelated(accessory);
  }

  addToCartFromRelated(item: AccessoryResponse): void {
    if (this.pendingRelatedCartIds().has(item.id) || item.stock <= 0) return;

    this.pendingRelatedCartIds.update((set) => new Set(set).add(item.id));
    this.cartError.set(null);

    this.cartService
      .addItemToCart({ accessoryId: item.id, quantity: 1 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pendingRelatedCartIds.update((set) => {
            const next = new Set(set);
            next.delete(item.id);
            return next;
          });
          this.addedRelatedCartId.set(item.id);
          this.cartAnnouncement.set(`${item.title} added to cart.`);
          setTimeout(() => {
            if (this.addedRelatedCartId() === item.id) this.addedRelatedCartId.set(null);
          }, 1800);
        },
        error: () => {
          this.pendingRelatedCartIds.update((set) => {
            const next = new Set(set);
            next.delete(item.id);
            return next;
          });
          this.showCartError('Could not add this item to the cart. Please try again.');
        },
      });
  }

  // ------------------------------------------------------------------
  // Reviews — loading
  // ------------------------------------------------------------------

  loadReviews(accessoryId: number, page: number): void {
    this.reviewsState.set(page === 0 ? 'loading' : 'loading-more');

    this.reviewService
      .getAllReviewsByAccessoryId(accessoryId, page, REVIEWS_PAGE_SIZE, REVIEWS_SORT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          // The DTO is typed as a single ReviewResponse, but it's actually paginated.
          const pageResponse = response as Page<ReviewResponse> | ReviewResponse[];
          const content: ReviewResponse[] = Array.isArray(pageResponse)
            ? pageResponse
            : (pageResponse as Page<ReviewResponse>).content ?? [];

          this.reviews.update((current) => (page === 0 ? content : [...current, ...content]));
          this.reviewsPage.set(page);

          if (!Array.isArray(pageResponse)) {
            const p = pageResponse as Page<ReviewResponse>;
            this.reviewsTotalPages.set(p.totalPages ?? 1);
            this.reviewsTotalElements.set(p.totalElements ?? content.length);
          } else {
            this.reviewsTotalPages.set(1);
            this.reviewsTotalElements.set(content.length);
          }

          this.reviewsState.set('loaded');
        },
        error: () => {
          this.reviewsState.set('error');
        },
      });
  }

  loadMoreReviews(): void {
    if (this.accessoryId == null || !this.hasMoreReviews()) return;
    this.loadReviews(this.accessoryId, this.reviewsPage() + 1);
  }

  retryLoadReviews(): void {
    if (this.accessoryId == null) return;
    this.loadReviews(this.accessoryId, 0);
  }

  // ------------------------------------------------------------------
  // Reviews — display helpers
  // ------------------------------------------------------------------

  reviewerName(review: ReviewResponse): string {
    const user = review.user as RegisterResponse | undefined;
    const first = user?.firstName?.trim();
    const last = user?.lastName?.trim();
    const fullName = [first, last].filter(Boolean).join(' ');
    return fullName || 'Anonymous';
  }

  isEdited(review: ReviewResponse): boolean {
    if (!review.updatedAt || !review.createdAt) return false;

    const created = new Date(review.createdAt).getTime();
    const updated = new Date(review.updatedAt).getTime();

    if (Number.isNaN(created) || Number.isNaN(updated)) return false;

    const TOLERANCE_MS = 2000;
    return updated - created > TOLERANCE_MS;
  }

  starState(rating: number, position: number): 'filled' | 'empty' {
    return position <= Math.round(rating) ? 'filled' : 'empty';
  }

  trackByReviewId(_index: number, review: ReviewResponse): number {
    return review.id;
  }

  // ------------------------------------------------------------------
  // Reviews — create / edit form
  // ------------------------------------------------------------------

  openCreateForm(event?: Event): void {
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.reviewFormTrigger = (event?.target as HTMLElement | null) ?? null;
    this.reviewFormMode.set('create');
    this.editingReviewId.set(null);
    this.formRating.set(0);
    this.hoverRating.set(0);
    this.formComment = '';
    this.reviewFormError.set(null);
    this.focusReviewFormFirstControl();
  }

  openEditForm(review: ReviewResponse, event?: Event): void {
    this.reviewFormTrigger = (event?.target as HTMLElement | null) ?? null;
    this.reviewFormMode.set('edit');
    this.editingReviewId.set(review.id);
    this.formRating.set(review.rating);
    this.hoverRating.set(0);
    this.formComment = review.comment;
    this.reviewFormError.set(null);
    this.focusReviewFormFirstControl();
  }

  /** Move focus into the freshly-opened form: first star, else the textarea. */
  private focusReviewFormFirstControl(): void {
    // Wait a tick so the @if block has rendered before querying.
    setTimeout(() => {
      const host = this.reviewFormRef?.nativeElement;
      const firstStar = host?.querySelector<HTMLElement>('.review-form__star-btn');
      const textarea = host?.querySelector<HTMLElement>('.review-form__textarea');
      (firstStar ?? textarea)?.focus();
    });
  }

  cancelReviewForm(): void {
    this.reviewFormMode.set(null);
    this.editingReviewId.set(null);
    this.formRating.set(0);
    this.hoverRating.set(0);
    this.formComment = '';
    this.reviewFormError.set(null);
    this.reviewFormTrigger?.focus();
    this.reviewFormTrigger = null;
  }

  setFormRating(value: number): void {
    this.formRating.set(value);
  }

  setHoverRating(value: number): void {
    this.hoverRating.set(value);
  }

  clearHoverRating(): void {
    this.hoverRating.set(0);
  }

  displayFormRating(): number {
    return this.hoverRating() || this.formRating();
  }

  submitReview(): void {
    if (this.accessoryId == null || this.isSubmittingReview()) return;

    if (this.formRating() < 1 || this.formRating() > 5) {
      this.reviewFormError.set('Please select a rating from 1 to 5 stars.');
      return;
    }
    if (!this.formComment.trim()) {
      this.reviewFormError.set('Please write a comment before submitting.');
      return;
    }

    this.isSubmittingReview.set(true);
    this.reviewFormError.set(null);

    const payload: ReviewRequest = {
      rating: this.formRating(),
      comment: this.formComment.trim(),
    };

    const mode = this.reviewFormMode();
    const editingId = this.editingReviewId();

    const request$ =
      mode === 'edit' && editingId != null
        ? this.reviewService.updateReview(editingId, payload)
        : this.reviewService.createReview(this.accessoryId, payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.isSubmittingReview.set(false);

        if (mode === 'edit' && editingId != null) {
          this.reviews.update((list) =>
            list.map((r) => (r.id === editingId ? { ...r, ...saved, mine: true } : r))
          );
        } else {
          this.reviews.update((list) => [saved, ...list]);
          this.reviewsTotalElements.update((n) => n + 1);
        }

        this.closeReviewForm();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmittingReview.set(false);
        this.reviewFormError.set(
          err?.error?.message ??
            'Something went wrong while saving your review. Please try again.'
        );
      },
    });
  }

  private closeReviewForm(): void {
    this.reviewFormMode.set(null);
    this.editingReviewId.set(null);
    this.formRating.set(0);
    this.hoverRating.set(0);
    this.formComment = '';
    this.reviewFormError.set(null);
    this.reviewFormTrigger?.focus();
    this.reviewFormTrigger = null;
  }

  // ------------------------------------------------------------------
  // Reviews — delete
  // ------------------------------------------------------------------

  requestDeleteReview(review: ReviewResponse, event?: Event): void {
    this.deleteTrigger = (event?.target as HTMLElement | null) ?? null;
    this.reviewPendingDelete.set(review);
    this.reviewDeleteError.set(null);
  }

  cancelDeleteReview(): void {
    if (this.isDeletingReview()) return;
    this.closeDeleteModal();
  }

  confirmDeleteReview(): void {
    const review = this.reviewPendingDelete();
    if (!review || this.isDeletingReview()) return;

    this.isDeletingReview.set(true);
    this.reviewDeleteError.set(null);

    this.reviewService
      .deleteReview(review.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.reviews.update((list) => list.filter((r) => r.id !== review.id));
          this.reviewsTotalElements.update((n) => Math.max(0, n - 1));
          this.isDeletingReview.set(false);
          this.closeDeleteModal();
        },
        error: () => {
          this.isDeletingReview.set(false);
          this.reviewDeleteError.set('Couldn’t delete this review. Please try again.');
        },
      });
  }

  private closeDeleteModal(): void {
    this.reviewPendingDelete.set(null);
    this.reviewDeleteError.set(null);
    this.deleteTrigger?.focus();
    this.deleteTrigger = null;
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
