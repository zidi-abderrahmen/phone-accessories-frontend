import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminDashboardService } from '../../core/services/admin-dashboard/admin-dashboard.service';
import { AdminDashboardResponse } from '../../core/models/admin-dashboard/admin-dashboard-response';
import { OrderResponse } from '../../core/models/checkout/order-response';
import { OrderStatus } from '../../core/models/checkout/enums/order-status';
import { PaymentMethod } from '../../core/models/checkout/enums/payment-method';

type DashboardState = 'loading' | 'loaded' | 'error';

interface QuickLink {
  label: string;
  description: string;
  route: string;
  icon: 'users' | 'category' | 'accessory' | 'role';
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard implements OnInit {
  private readonly dashboardService = inject(AdminDashboardService);

  readonly OrderStatus = OrderStatus;

  state = signal<DashboardState>('loading');
  dashboard = signal<AdminDashboardResponse | null>(null);
  errorMessage = signal('');

  readonly quickLinks: QuickLink[] = [
    {
      label: 'User Management',
      description: 'View, filter, block, and manage user accounts.',
      route: '/admin/users',
      icon: 'users',
    },
    {
      label: 'Category Management',
      description: 'Organize accessories into browsable categories.',
      route: '/categories',
      icon: 'category',
    },
    {
      label: 'Accessory Management',
      description: 'Add, edit, and manage the product catalog.',
      route: '/accessories',
      icon: 'accessory',
    },
    {
      label: 'Role Management',
      description: 'Configure roles and administrator permissions.',
      route: '/admin/roles',
      icon: 'role',
    },
  ];

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.state.set('loading');
    this.errorMessage.set('');

    this.dashboardService.getAdminDashboard(10).subscribe({
      next: (response) => {
        this.dashboard.set(response);
        this.state.set('loaded');
      },
      error: () => {
        this.errorMessage.set('Failed to load the dashboard. Please try again.');
        this.state.set('error');
      },
    });
  }

  // ---------------------------------------------------------------------
  // Display helpers
  // ---------------------------------------------------------------------
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

  trackByOrderId(_index: number, order: OrderResponse): number {
    return order.id;
  }
}