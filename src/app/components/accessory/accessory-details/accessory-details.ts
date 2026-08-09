import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AccessoryResponse } from '../../../core/models/accessory/accessory-response';
import { AccessoryService } from '../../../core/services/accessory/accessory.service';

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
  private readonly destroy$ = new Subject<void>();

  state = signal<PageState>('loading');
  accessory: AccessoryResponse | null = null;
  accessoryId: number | null = null;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.extractAccessoryId();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    if (!this.accessory || this.accessory.stock <= 0) return;
    // TODO: Wire in checkout flow
    // this.router.navigate(['/checkout'], { state: { accessory: this.accessory } });
    console.log('Buy now:', this.accessory.title);
  }

  addToCart(): void {
    if (!this.accessory || this.accessory.stock <= 0) return;
    // TODO: Wire in cart service
    // this.cartService.addItem(this.accessory);
    console.log('Add to cart:', this.accessory.title);
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