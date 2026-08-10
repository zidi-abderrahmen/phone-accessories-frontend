import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth/auth.service';
import { MeResponse } from '../../core/models/me/me.response';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

interface OrderSummary {
  id: string;
  placedAt: string;
  status: string;
  total: number;
}

interface ViewedAccessory {
  id: number;
  title: string;
  price: number;
}

@Component({
  selector: 'app-me',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './me.html',
  styleUrl: './me.scss'
})
export class Me implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly user = signal<MeResponse | null>(null);
  protected readonly profileState = signal<LoadState>('idle');

  // No OrderService / "recently viewed" tracking exists yet in this codebase,
  // so these stay empty and render their empty states. Wire up real data
  // sources here once those services land.
  protected readonly recentOrders = signal<OrderSummary[]>([]);
  protected readonly recentlyViewed = signal<ViewedAccessory[]>([]);

  protected readonly isDarkTheme = signal(false);

  // Notification preferences are local-only for now — no preferences
  // endpoint exists on MeResponse yet. TODO: persist via a real API call.
  protected readonly emailNotifications = signal(true);
  protected readonly orderUpdates = signal(true);
  protected readonly promotionalOffers = signal(false);

  protected readonly fullName = computed(() => {
    const u = this.user();
    return u ? `${u.firstName} ${u.lastName}`.trim() : '';
  });

  protected readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    const first = u.firstName?.charAt(0) ?? '';
    const last = u.lastName?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase();
  });

  protected readonly primaryRoleLabel = computed(() => {
    const roles = this.user()?.roles ?? [];
    if (roles.length === 0) return 'Customer';
    return this.formatRole(roles[0]);
  });

  ngOnInit(): void {
    this.syncThemeState();
    this.loadProfile();

    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => this.user.set(user));
  }

  protected loadProfile(): void {
    this.profileState.set('loading');
    this.authService
      .getCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.user.set(user);
          this.profileState.set('loaded');
        },
        error: () => this.profileState.set('error')
      });
  }

  protected logout(): void {
    this.authService
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigateByUrl('/login'),
        error: () => this.router.navigateByUrl('/login')
      });
  }

  protected toggleTheme(): void {
    const html = document.documentElement;
    const next = !this.isDarkTheme();

    html.classList.toggle('dark-theme', next);
    html.style.colorScheme = next ? 'dark' : 'light';

    try {
      localStorage.setItem('pa-theme', next ? 'dark' : 'light');
    } catch {
      // localStorage unavailable (private mode, SSR, etc.) — theme just won't persist
    }

    this.isDarkTheme.set(next);
  }

  protected toggleEmailNotifications(): void {
    this.emailNotifications.update((v) => !v);
    // TODO: persist to backend once a preferences endpoint exists
  }

  protected toggleOrderUpdates(): void {
    this.orderUpdates.update((v) => !v);
    // TODO: persist to backend once a preferences endpoint exists
  }

  protected togglePromotionalOffers(): void {
    this.promotionalOffers.update((v) => !v);
    // TODO: persist to backend once a preferences endpoint exists
  }

  private syncThemeState(): void {
    this.isDarkTheme.set(document.documentElement.classList.contains('dark-theme'));
  }

  private formatRole(role: string): string {
    const cleaned = role.replace(/^ROLE_/i, '').replace(/_/g, ' ').toLowerCase();
    return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
  }
}