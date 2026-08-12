import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CategoryService } from '../../core/services/category/category.service';
import { AccessoryService } from '../../core/services/accessory/accessory.service';
import { AuthService } from '../../core/services/auth/auth.service';

import { CategoryResponse } from '../../core/models/category/category-response';
import { AccessoryResponse } from '../../core/models/accessory/accessory-response';
import { MeResponse } from '../../core/models/me/me.response';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLinkActive, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly accessoryService = inject(AccessoryService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // For the simple search
  private readonly router = inject(Router);

  // Featured categories
  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly categoriesState = signal<LoadState>('idle');
  protected readonly categorySkeletons = Array.from({ length: 6 });

  // Featured accessories
  protected readonly accessories = signal<AccessoryResponse[]>([]);
  protected readonly accessoriesState = signal<LoadState>('idle');
  protected readonly productSkeletons = Array.from({ length: 8 });

  // Auth / theme
  protected readonly currentUser = signal<MeResponse | null>(null);
  protected readonly isAuthenticated = computed(() => this.currentUser() !== null);
  protected readonly isDarkTheme = signal(false);

  ngOnInit(): void {
    this.syncThemeState();
    this.loadCategories();
    this.loadAccessories();

    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => this.currentUser.set(user));

    this.authService
      .checkAuth()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
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

  private syncThemeState(): void {
    this.isDarkTheme.set(document.documentElement.classList.contains('dark-theme'));
  }

  protected initials(user: MeResponse | null): string {
    if (!user) {
      return '';
    }
    const name = (user as any).fullName ?? (user as any).username ?? (user as any).email ?? '';
    return String(name).trim().charAt(0).toUpperCase();
  }

  protected isOutOfStock(accessory: AccessoryResponse): boolean {
    return accessory.stock <= 0;
  }

  protected isLowStock(accessory: AccessoryResponse): boolean {
    return accessory.stock > 0 && accessory.stock <= 5;
  }

  protected isNewArrival(accessory: AccessoryResponse): boolean {
    const created = new Date(accessory.createdAt).getTime();
    if (Number.isNaN(created)) {
      return false;
    }
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - created <= THIRTY_DAYS_MS;
  }

  protected addToCart(event: Event, accessory: AccessoryResponse): void {
    event.preventDefault();
    event.stopPropagation();
    // TODO: wire up once CartService lands — kept as a no-op stub so the
    // card's interaction pattern matches the rest of the design system.
    console.log('Add to cart:', accessory.id);
  }

  protected categoryInitial(category: CategoryResponse): string {
    return category.name?.charAt(0)?.toUpperCase() ?? '?';
  }

  protected onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    const keyword = input.value.trim();
    if (keyword) {
      this.router.navigate(['/accessories'], { queryParams: { keyword } });
    }
  }
}