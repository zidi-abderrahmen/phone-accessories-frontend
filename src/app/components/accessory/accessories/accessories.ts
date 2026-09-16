import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal, computed, DestroyRef } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AccessoryResponse } from '../../../core/models/accessory/accessory-response';
import { CategoryResponse } from '../../../core/models/category/category-response';
import { Page } from '../../../core/models/page';
import { AccessoryService } from '../../../core/services/accessory/accessory.service';
import { CategoryService } from '../../../core/services/category/category.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { FormsModule } from '@angular/forms';
import { SearchRequest } from '../../../core/models/accessory/search/search-request';
import { UserService } from '../../../core/services/user/user.service';
import { Navbar } from "../../../shared/components/navbar/navbar";
import { Footer } from "../../../shared/components/footer/footer";
import { WishlistFacadeService } from '../../../core/services/wishlist-facade/wishlist-facade.service';

@Component({
  selector: 'app-accessories',
  standalone: true,
  imports: [RouterModule, CurrencyPipe, CommonModule, FormsModule, Navbar, Footer],
  templateUrl: './accessories.html',
  styleUrl: './accessories.scss',
})
export class Accessories implements OnInit {
  private accessoryService = inject(AccessoryService);
  private categoryService = inject(CategoryService);
  protected readonly wishlist = inject(WishlistFacadeService);
  protected router = inject(Router);
  private activateRoute = inject(ActivatedRoute);
  authService = inject(AuthService);
  userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isAdmin = computed(() => this.userService.hasAnyRole(['SUPER_ADMIN', 'ADMIN']));

  // Data state
  accessories = signal<AccessoryResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);
  page: Page<AccessoryResponse> | null = null;

  // Pagination state
  currentPage = 0;
  pageSize = 12;
  totalElements = 0;
  totalPages = 0;

  // Filter state (server-side)
  searchQuery = signal('');
  selectedCategoryId = signal<number | null>(null);
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  inStockOnly = signal<boolean | null>(null);

  // UI state
  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Delete modal state
  showDeleteModal = signal(false);
  accessoryToDelete: AccessoryResponse | null = null;
  deleting = signal(false);

  // Computed: are any filters active?
  hasActiveFilters = computed(() =>
    !!this.searchQuery() ||
    this.selectedCategoryId() !== null ||
    this.minPrice() !== null ||
    this.maxPrice() !== null ||
    this.inStockOnly() !== null
  );

  ngOnInit(): void {
    this.loadCategories();
    this.wishlist.load();

    const keyword = this.activateRoute.snapshot.queryParams['keyword'];
    if (keyword) {
      this.searchQuery.set(String(keyword).trim());
    }

    this.search(0);
  }

  private loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (response) => {
        const categories = Array.isArray(response) ? response : response.content ?? [];
        this.categories.set(categories);
      }
    });
  }

  // Central method: runs the server-side search with current filter state
  search(page = 0): void {
    this.loading.set(true);
    this.clearMessages();

    const request: SearchRequest = {
      categoryId: this.selectedCategoryId(),
      keyword: this.searchQuery() || null,
      minPrice: this.minPrice(),
      maxPrice: this.maxPrice(),
      inStock: this.inStockOnly(),
    };

    this.accessoryService.searchAccessories(request, page, this.pageSize).subscribe({
      next: (response) => {
        this.page = response;
        this.accessories.set(response.content);
        this.currentPage = response.pageNumber ?? 0;
        this.pageSize = response.size;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Failed to load accessories. Please try again later.');
      },
    });
  }

  // ── Explicit filter setters (NO auto-search) ──

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value.trim());
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId.set(categoryId ? Number(categoryId) : null);
  }

  onMinPriceChange(value: string): void {
    this.minPrice.set(value ? Number(value) : null);
  }

  onMaxPriceChange(value: string): void {
    this.maxPrice.set(value ? Number(value) : null);
  }

  onInStockChange(checked: boolean): void {
    this.inStockOnly.set(checked ? true : null);
  }

  // ── Explicit actions ──

  /** Triggered only by the Search button */
  onSearchClick(): void {
    this.search(0);
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.selectedCategoryId.set(null);
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.inStockOnly.set(null);
    this.search(0);
  }

  // ── Navigation & CRUD ──

  viewAccessory(accessory: AccessoryResponse): void {
    this.router.navigate(['/accessories', accessory.id]);
  }

  editAccessory(event: Event, accessory: AccessoryResponse): void {
    event.stopPropagation();
    if (!this.isAdmin()) return;
    this.router.navigate(['/admin/accessories/edit', accessory.id]);
  }

  confirmDelete(event: Event, accessory: AccessoryResponse): void {
    event.stopPropagation();
    if (!this.isAdmin()) return;
    this.accessoryToDelete = accessory;
    this.showDeleteModal.set(true);
    this.clearMessages();
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.accessoryToDelete = null;
  }

  deleteAccessory(): void {
    if (!this.accessoryToDelete) return;

    this.deleting.set(true);
    this.clearMessages();

    this.accessoryService.deleteAccessory(this.accessoryToDelete.id).subscribe({
      next: () => {
        const title = this.accessoryToDelete!.title;
        this.successMessage.set(`Accessory "${title}" deleted successfully.`);
        this.closeDeleteModal();

        const remainingOnPage = this.accessories().length - 1;
        if (remainingOnPage === 0 && this.currentPage > 0) {
          this.search(this.currentPage - 1);
        } else {
          this.search(this.currentPage);
        }
      },
      error: (err) => {
        this.deleting.set(false);
        if (err.status === 403) {
          this.errorMessage.set('You do not have permission to delete this accessory.');
        } else if (err.status === 404) {
          this.errorMessage.set('Accessory not found. It may have already been deleted.');
          this.closeDeleteModal();
          this.search(this.currentPage);
        } else {
          this.errorMessage.set('Failed to delete accessory. Please try again later.');
        }
      },
    });
  }

  goToPage(page: number): void {
    const targetPage = Number(page); 
    
    if (
      !this.loading() && // Prevent triggers if currently fetching
      targetPage >= 0 && 
      targetPage < this.totalPages && 
      targetPage !== this.currentPage
    ) {
      this.search(page);
    }
  }

  getStockLabel(stock: number): { text: string; variant: 'in' | 'low' | 'out' } {
    if (stock <= 0) return { text: 'Out of stock', variant: 'out' };
    if (stock <= 5) return { text: 'Low stock', variant: 'low' };
    return { text: 'In stock', variant: 'in' };
  }

  private closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.accessoryToDelete = null;
    this.deleting.set(false);
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }
}