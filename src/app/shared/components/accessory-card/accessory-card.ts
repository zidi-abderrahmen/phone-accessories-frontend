import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AccessoryResponse } from '../../../core/models/accessory/accessory-response';

@Component({
  selector: 'app-accessory-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './accessory-card.html',
  styleUrl: './accessory-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessoryCard {
  @Input({ required: true }) product!: AccessoryResponse;
  @Input() showWishlist = true;
  @Input() showRating = true;
  @Input() showInventory = true;
  @Input() isWishlisted = false;
  @Input() isWishlistPending = false;
  @Input() isCartPending = false;
  @Input() justAdded = false;

  @Output() addToCart = new EventEmitter<AccessoryResponse>();
  @Output() toggleWishlist = new EventEmitter<{ product: AccessoryResponse; event: Event }>();

  protected isOutOfStock(): boolean {
    return this.product.stock <= 0;
  }

  protected isLowStock(): boolean {
    return this.product.stock > 0 && this.product.stock <= 5;
  }

  protected isNewArrival(): boolean {
    const created = new Date(this.product.createdAt).getTime();
    if (Number.isNaN(created)) {
      return false;
    }
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - created <= THIRTY_DAYS_MS;
  }

  protected discountPercent(): number {
    if (!this.product.originalPrice) return 0;
    return Math.round((1 - this.product.price / this.product.originalPrice) * 100);
  }

  protected onAddToCart(event: Event): void {
    event.stopPropagation();
    if (!this.isOutOfStock() && !this.isCartPending) {
      this.addToCart.emit(this.product);
    }
  }

  protected onToggleWishlist(event: Event): void {
    this.toggleWishlist.emit({ product: this.product, event });
  }
}