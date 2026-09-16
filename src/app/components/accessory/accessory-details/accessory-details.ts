import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AccessoryResponse } from '../../../core/models/accessory/accessory-response';
import { AccessoryService } from '../../../core/services/accessory/accessory.service';
import { CartService } from '../../../core/services/cart/cart.service';
import { CartItemRequest } from '../../../core/models/cart/items/cart-item-request';
import { UserService } from '../../../core/services/user/user.service';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { ReviewService } from '../../../core/services/review/review.service';
import { ReviewRequest } from '../../../core/models/review/review-request';
import { ReviewResponse } from '../../../core/models/review/review-response';
import { Page } from '../../../core/models/page';
import { RegisterResponse } from '../../../core/models/user/register/register.response';
import { WishlistFacadeService } from '../../../core/services/wishlist-facade/wishlist-facade.service';

type PageState = 'loading' | 'loaded' | 'not-found' | 'error';
type ReviewsState = 'idle' | 'loading' | 'loading-more' | 'loaded' | 'error';
type ReviewFormMode = 'create' | 'edit' | null;

const REVIEWS_PAGE_SIZE = 10;
const REVIEWS_SORT = 'createdAt,desc';

@Component({
  selector: 'app-accessories-details',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './accessory-details.html',
  styleUrl: './accessory-details.scss',
})
export class AccessoriesDetails implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly accessoryService = inject(AccessoryService);
  private readonly userService = inject(UserService);
  private readonly cartService = inject(CartService);
  protected readonly wishlist = inject(WishlistFacadeService);
  private readonly reviewService = inject(ReviewService);
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

  // Delete confirmation state
  protected readonly reviewPendingDelete = signal<ReviewResponse | null>(null);
  protected readonly isDeletingReview = signal(false);
  protected readonly reviewDeleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.extractAccessoryId();
    this.wishlist.load();

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
        this.loadReviews(id, 0);
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
  // Cart / wishlist actions (unchanged)
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
      }
    });
  }

  addToCart(): void {
    if (!this.accessory || this.accessory.stock <= 0 || this.addingToCart()) {
      return;
    }

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
        error: (err: HttpErrorResponse) => {
          this.addingToCart.set(false);
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

  // ------------------------------------------------------------------
  // Reviews — loading
  // ------------------------------------------------------------------

  loadReviews(accessoryId: number, page: number): void {
    this.reviewsState.set(page === 0 ? 'loading' : 'loading-more');

    this.reviewService
      .getAllReviewsByAccessoryId(accessoryId, page, REVIEWS_PAGE_SIZE, REVIEWS_SORT)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // See the class-level ASSUMPTIONS note: the DTO says this is a
          // single ReviewResponse, but it's actually paginated.
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
    const user = review.user as RegisterResponse;
    const fullName = `${user.firstName} ${user.lastName}`;
    return fullName ?? 'Anonymous';
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

  openCreateForm(): void {
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.reviewFormMode.set('create');
    this.editingReviewId.set(null);
    this.formRating.set(0);
    this.hoverRating.set(0);
    this.formComment = '';
    this.reviewFormError.set(null);
  }

  openEditForm(review: ReviewResponse): void {
    this.reviewFormMode.set('edit');
    this.editingReviewId.set(review.id);
    this.formRating.set(review.rating);
    this.hoverRating.set(0);
    this.formComment = review.comment;
    this.reviewFormError.set(null);
  }

  cancelReviewForm(): void {
    this.reviewFormMode.set(null);
    this.editingReviewId.set(null);
    this.formRating.set(0);
    this.hoverRating.set(0);
    this.formComment = '';
    this.reviewFormError.set(null);
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

    request$.pipe(takeUntil(this.destroy$)).subscribe({
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

        this.cancelReviewForm();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmittingReview.set(false);
        this.reviewFormError.set(
          err?.error?.message ?? 'Something went wrong while saving your review. Please try again.'
        );
      },
    });
  }

  // ------------------------------------------------------------------
  // Reviews — delete
  // ------------------------------------------------------------------

  requestDeleteReview(review: ReviewResponse): void {
    this.reviewPendingDelete.set(review);
    this.reviewDeleteError.set(null);
  }

  cancelDeleteReview(): void {
    if (this.isDeletingReview()) return;
    this.reviewPendingDelete.set(null);
    this.reviewDeleteError.set(null);
  }

  confirmDeleteReview(): void {
    const review = this.reviewPendingDelete();
    if (!review || this.isDeletingReview()) return;

    this.isDeletingReview.set(true);
    this.reviewDeleteError.set(null);

    this.reviewService
      .deleteReview(review.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.reviews.update((list) => list.filter((r) => r.id !== review.id));
          this.reviewsTotalElements.update((n) => Math.max(0, n - 1));
          this.isDeletingReview.set(false);
          this.reviewPendingDelete.set(null);
        },
        error: () => {
          this.isDeletingReview.set(false);
          this.reviewDeleteError.set('Couldn’t delete this review. Please try again.');
        },
      });
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