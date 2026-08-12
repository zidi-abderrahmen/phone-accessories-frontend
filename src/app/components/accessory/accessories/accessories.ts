import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AccessoryResponse } from '../../../core/models/accessory/accessory-response';
import { CategoryResponse } from '../../../core/models/category/category-response';
import { Page } from '../../../core/models/page';
import { AccessoryService } from '../../../core/services/accessory/accessory.service';
import { CategoryService } from '../../../core/services/category/category.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { FormsModule } from '@angular/forms';
import { SearchRequest } from '../../../core/models/accessory/search/search-request';

@Component({
  selector: 'app-accessories',
  standalone: true,
  imports: [RouterModule, CurrencyPipe, CommonModule, FormsModule],
  templateUrl: './accessories.html',
  styleUrl: './accessories.scss',
})
export class Accessories implements OnInit {
  private accessoryService = inject(AccessoryService);
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  authService = inject(AuthService);

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

  private searchSubject = new Subject<string>();

  // UI state
  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Delete modal state
  showDeleteModal = false;
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

    // Debounce keyword typing so we don't hit the API on every keystroke
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.search(0));

    this.search(0);
  }

  private loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (response) => {
        const categories = Array.isArray(response) ? response : response.content ?? [];
        this.categories.set(categories);
      },
      error: () => {
        // Not critical enough to block the page, silently ignore or log
      },
    });
  }

  // Central method: runs the server-side search with current filter state
  search(page: number = 0): void {
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
        this.currentPage = response.pageNumber;
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

  // Search input handler (debounced)
  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.search(0);
  }

  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId.set(categoryId ? Number(categoryId) : null);
    this.search(0);
  }

  onMinPriceChange(value: string): void {
    this.minPrice.set(value ? Number(value) : null);
  }

  onMaxPriceChange(value: string): void {
    this.maxPrice.set(value ? Number(value) : null);
  }

  onPriceBlur(): void {
    // Trigger search once the user finishes typing price bounds
    this.search(0);
  }

  onInStockChange(checked: boolean): void {
    this.inStockOnly.set(checked ? true : null);
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

  // Navigate to accessory details
  viewAccessory(accessory: AccessoryResponse): void {
    this.router.navigate(['/accessories', accessory.id]);
  }

  editAccessory(event: Event, accessory: AccessoryResponse): void {
    event.stopPropagation();
    this.router.navigate(['/admin/accessories/edit', accessory.id]);
  }

  confirmDelete(event: Event, accessory: AccessoryResponse): void {
    event.stopPropagation();
    this.accessoryToDelete = accessory;
    this.showDeleteModal = true;
    this.clearMessages();
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
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
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.search(page);
    }
  }

  getStockLabel(stock: number): { text: string; variant: 'in' | 'low' | 'out' } {
    if (stock <= 0) return { text: 'Out of stock', variant: 'out' };
    if (stock <= 5) return { text: 'Low stock', variant: 'low' };
    return { text: 'In stock', variant: 'in' };
  }

  private closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.accessoryToDelete = null;
    this.deleting.set(false);
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }
}