import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CategoryResponse } from '../../core/models/category/category-response';
import { CategoryService } from '../../core/services/category/category.service';
import { UserService } from '../../core/services/user/user.service';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';

type LoadState = 'loading' | 'loaded' | 'error';

const PLACEHOLDER_IMAGE = '/assets/placeholder-product.svg';
const PAGE_SIZE = 12;
const SORT = 'name,asc';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [RouterLink, Navbar, Footer],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isAdmin = computed(() => this.userService.hasAnyRole(['SUPER_ADMIN', 'ADMIN']));

  // Data state
  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly state = signal<LoadState>('loading');
  protected readonly isEmpty = computed(() => this.state() === 'loaded' && this.categories().length === 0);

  // Pagination state
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly pageSize = PAGE_SIZE;

  // Notifications
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  // Delete modal state
  protected readonly showDeleteModal = signal(false);
  protected readonly categoryToDelete = signal<CategoryResponse | null>(null);
  protected readonly deleting = signal(false);

  protected readonly placeholderImage = PLACEHOLDER_IMAGE;
  protected readonly skeletonPlaceholders = Array.from({ length: 8 });

  ngOnInit(): void {
    this.loadCategories();
  }

  protected loadCategories(page: number = this.currentPage()): void {
    this.state.set('loading');
    this.clearMessages();

    this.categoryService
      .getAllCategories(page, this.pageSize, SORT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.categories.set(response.content);
          this.currentPage.set(response.number ?? 0);
          this.totalElements.set(response.totalElements);
          this.totalPages.set(response.totalPages);
          this.state.set('loaded');
        },
        error: () => {
          this.state.set('error');
        },
      });
  }

  // Falls back to the shared placeholder artwork when a category image is
  // missing or fails to load, mirroring Category Details' image handling.
  protected onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.src.endsWith(PLACEHOLDER_IMAGE)) return;
    img.src = PLACEHOLDER_IMAGE;
  }

  // ---------------------------------------------------------------------
  // Delete flow
  // ---------------------------------------------------------------------
  protected confirmDelete(event: Event, category: CategoryResponse): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isAdmin()) return;

    this.categoryToDelete.set(category);
    this.showDeleteModal.set(true);
    this.clearMessages();
  }

  protected cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.categoryToDelete.set(null);
  }

  protected deleteCategory(): void {
    const category = this.categoryToDelete();
    if (!category) return;

    this.deleting.set(true);
    this.clearMessages();

    this.categoryService
      .deleteCategory(category.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.categories.update((list) => list.filter((c) => c.id !== category.id));
          this.successMessage.set(`Category "${category.name}" deleted successfully.`);
          this.closeDeleteModal();

          if (this.categories().length === 0 && this.currentPage() > 0) {
            // Current page is now empty — step back to the previous page.
            this.loadCategories(this.currentPage() - 1);
          } else if (this.categories().length === 0 && this.totalElements() > 1) {
            // Edge case: refetch the current page to pull in the next item.
            this.loadCategories(this.currentPage());
          }
        },
        error: (err) => {
          this.deleting.set(false);
          if (err.status === 403) {
            this.errorMessage.set('You do not have permission to delete this category.');
          } else if (err.status === 404) {
            this.errorMessage.set('Category not found. It may have already been deleted.');
            this.categories.update((list) => list.filter((c) => c.id !== category.id));
            this.closeDeleteModal();
          } else {
            this.errorMessage.set('Failed to delete category. Please try again later.');
          }
        },
      });
  }

  // ---------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------
  protected goToPage(page: number): void {
    const targetPage = Number(page);

    if (
      this.state() !== 'loading' &&
      targetPage >= 0 &&
      targetPage < this.totalPages() &&
      targetPage !== this.currentPage()
    ) {
      this.loadCategories(targetPage);
    }
  }

  private closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.categoryToDelete.set(null);
    this.deleting.set(false);
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }
}