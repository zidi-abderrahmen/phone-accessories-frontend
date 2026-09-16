import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderStatus } from '../../../core/models/checkout/enums/order-status';
import { PaymentMethod } from '../../../core/models/checkout/enums/payment-method';
import { ShippingMethod } from '../../../core/models/checkout/enums/shipping-method';
import { OrderResponse } from '../../../core/models/checkout/order-response';
import { OrderService } from '../../../core/services/checkout/order.service';
import { AccessoryResponse } from '../../../core/models/accessory/accessory-response';

/**
 * ASSUMPTIONS — please verify against your actual project structure:
 * 1. Import paths mirror the depth used elsewhere (order.service.ts,
 *    order-list.ts). Adjust if order-details.ts lives somewhere else.
 * 2. The route is assumed to expose the order id as `:id`
 *    (e.g. /account/orders/:id). Adjust the param name in
 *    `ngOnInit()` if your routing config differs.
 * 3. `OrderItemResponse.accessory` (typed `AccessoryResponse`) shape
 *    wasn't provided — only `name` / `imageUrl` are read, defensively,
 *    matching order-list.ts. Adjust `itemImage()` / `itemTitle()` if
 *    your AccessoryResponse uses different property names.
 */

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-details.html',
  styleUrl: './order-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  readonly OrderStatus = OrderStatus;

  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly order = signal<OrderResponse | null>(null);

  readonly itemCount = computed(() =>
    (this.order()?.items ?? []).reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly subtotal = computed(() =>
    (this.order()?.items ?? []).reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    )
  );

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam !== null ? Number(idParam) : NaN;

    if (idParam === null || Number.isNaN(id)) {
      this.isLoading.set(false);
      this.loadError.set('Invalid order reference.');
      return;
    }

    this.loadOrder(id);
  }

  loadOrder(id: number): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.orderService.getOrderById(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          err?.status === 404
            ? 'This order could not be found.'
            : 'We couldn’t load this order. Please try again.'
        );
        this.isLoading.set(false);
      },
    });
  }

  retry(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam !== null ? Number(idParam) : NaN;
    if (!Number.isNaN(id)) this.loadOrder(id);
  }

  // ---------------------------------------------------------------------
  // Display helpers
  // ---------------------------------------------------------------------
  lineTotal(unitPrice: number, quantity: number): number {
    return unitPrice * quantity;
  }

  itemImage(item: OrderResponse['items'][number]): string {
    return (item.accessory as AccessoryResponse)?.imageUrl ?? '';
  }

  itemTitle(item: OrderResponse['items'][number]): string {
    return (item.accessory as AccessoryResponse)?.title ?? 'Accessory';
  }

  statusLabel(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'Pending';
      case OrderStatus.PROCESSING:
        return 'Processing';
      case OrderStatus.SHIPPED:
        return 'Shipped';
      case OrderStatus.DELIVERED:
        return 'Delivered';
      case OrderStatus.CANCELLED:
        return 'Cancelled';
      default:
        return status;
    }
  }

  paymentLabel(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CREDIT_CARD:
        return 'Credit / Debit Card';
      case PaymentMethod.PAYPAL:
        return 'PayPal';
      case PaymentMethod.CASH_ON_DELIVERY:
        return 'Cash on Delivery';
      default:
        return method;
    }
  }

  shippingLabel(method: ShippingMethod): string {
    switch (method) {
      case ShippingMethod.EXPRESS:
        return 'Express Delivery';
      case ShippingMethod.STANDARD:
      default:
        return 'Standard Delivery';
    }
  }

  trackByItemId(_index: number, item: OrderResponse['items'][number]): number {
    return item.id;
  }
}