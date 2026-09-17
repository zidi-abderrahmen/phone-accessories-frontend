import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderStatus } from '../../../core/models/checkout/enums/order-status';
import { PaymentMethod } from '../../../core/models/checkout/enums/payment-method';
import { PaymentStatus } from '../../../core/models/checkout/enums/payment-status';
import { OrderResponse } from '../../../core/models/checkout/order-response';
import { OrderService } from '../../../core/services/checkout/order.service';
import { RouterLink } from '@angular/router';
import { Navbar } from "../../../shared/components/navbar/navbar";

type RowState = 'idle' | 'busy' | 'error';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar],
  templateUrl: './order-list.html',
  styleUrl: './order-list.scss',
})
export class OrderList implements OnInit {
  private readonly orderService = inject(OrderService);

  // --- state ---
  orders = signal<OrderResponse[]>([]);
  loading = signal(true);
  loadError = signal(false);
  expandedId = signal<number | null>(null);
  busyOrderId = signal<number | null>(null);
  rowState = signal<Record<number, RowState>>({});

  // --- derived ---
  totalSpent = computed(() =>
    this.orders().reduce((sum, o) => sum + o.totalAmount, 0)
  );

  activeCount = computed(
    () => this.orders().filter(
      (o) => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED
    ).length
  );

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.orderService.getMyOrdersHistory().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  toggleExpand(id: number): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  cancelOrder(id: number): void {
    if (!confirm('Cancel this order? This action cannot be undone.')) return;
    this.setRowState(id, 'busy');
    this.busyOrderId.set(id);
    this.orderService.cancelOrder(id).subscribe({
      next: () => {
        this.orders.update((list) =>
          list.map((o) => (o.id === id ? { ...o, status: OrderStatus.CANCELLED } : o))
        );
        this.clearRow(id);
      },
      error: () => {
        this.setRowState(id, 'error');
        setTimeout(() => this.clearRow(id), 3000);
      },
    });
  }

  private setRowState(id: number, state: RowState): void {
    this.rowState.update((map) => ({ ...map, [id]: state }));
  }

  private clearRow(id: number): void {
    this.rowState.update((map) => {
      const next = { ...map };
      delete next[id];
      return next;
    });
    this.busyOrderId.set(null);
  }

  statusLabel(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Pending',
      [OrderStatus.PROCESSING]: 'Progressing',
      [OrderStatus.SHIPPED]: 'Shipped',
      [OrderStatus.DELIVERED]: 'Delivered',
      [OrderStatus.CANCELLED]: 'Cancelled',
    };
    return map[status] ?? String(status);
  }

  paymentLabel(method: PaymentMethod): string {
    const map: Record<PaymentMethod, string> = {
      [PaymentMethod.CREDIT_CARD]: 'Credit card',
      [PaymentMethod.PAYPAL]: 'PayPal',
      [PaymentMethod.CASH_ON_DELIVERY]: 'Cash on delivery',
    };
    return map[method] ?? String(method);
  }

  paymentStatusLabel(status: PaymentStatus): string {
    const map: Record<PaymentStatus, string> = {
      [PaymentStatus.PENDING]: 'Payment pending',
      [PaymentStatus.PAID]: 'Paid',
      [PaymentStatus.FAILED]: 'Payment failed',
      [PaymentStatus.REFUNDED]: 'Refunded',
    };
    return map[status] ?? String(status);
  }
}