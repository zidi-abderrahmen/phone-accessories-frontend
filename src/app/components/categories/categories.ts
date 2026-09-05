import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CategoryResponse } from '../../core/models/category/category-response';
import { Page } from '../../core/models/page';
import { CategoryService } from '../../core/services/category/category.service';
import { CommonModule, DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth/auth.service';
import { UserService } from '../../core/services/user/user.service';
import { Navbar } from "../../shared/components/navbar/navbar";
import { Footer } from "../../shared/components/footer/footer";

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [RouterModule, DatePipe, CommonModule, Navbar, Footer],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories implements OnInit {
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  authService = inject(AuthService);
  userService = inject(UserService);

  // Data state
  categories = signal<CategoryResponse[]>([]);
  filteredCategories: CategoryResponse[] = [];
  page: Page<CategoryResponse> | null = null;

  // Pagination state
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // UI state
  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Delete modal state
  showDeleteModal = false;
  categoryToDelete: CategoryResponse | null = null;
  deleting = signal(false);

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(page: number = 0, size: number = 10): void {
    this.loading.set(true);
    this.clearMessages();

    this.categoryService.getAllCategories(page, size).subscribe({
      next: (response) => {
        this.page = response;
        this.categories.set(response.content);
        this.filteredCategories = [...response.content];
        this.currentPage = response.pageNumber;
        this.pageSize = response.size;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Failed to load categories. Please try again later.');
      }
    });
  }

  // Navigate to category details
  viewCategory(category: CategoryResponse): void {
    this.router.navigate(['/categories', category.id]);
  }

  editCategory(event: Event, category: CategoryResponse): void {
    event.stopPropagation();
    this.router.navigate(['/admin/categories/edit', category.id]);
  }

  // Open delete confirmation modal
  confirmDelete(event: Event, category: CategoryResponse): void {
    event.stopPropagation(); // Prevent card navigation
    this.categoryToDelete = category;
    this.showDeleteModal = true;
    this.clearMessages();
  }

  // Close modal without deleting
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.categoryToDelete = null;
  }

  // Execute deletion
  deleteCategory(): void {
    if (!this.categoryToDelete) {
      return;
    }

    this.deleting.set(true);
    this.clearMessages();

    this.categoryService.deleteCategory(this.categoryToDelete.id).subscribe({
      next: () => {
        // Remove from both arrays
        const id = this.categoryToDelete!.id;
        this.categories.set(this.categories().filter(c => c.id !== id));
        this.filteredCategories = this.filteredCategories.filter(c => c.id !== id);

        this.successMessage.set(`Category "${this.categoryToDelete!.name}" deleted successfully.`);
        this.closeDeleteModal();

        // If current page is now empty and not the first page, reload previous page
        if (this.filteredCategories.length === 0 && this.currentPage > 0) {
          this.loadCategories(this.currentPage - 1, this.pageSize);
        } else if (this.filteredCategories.length === 0 && this.totalElements > 1) {
          // Edge case: reload current page to fetch new data
          this.loadCategories(this.currentPage, this.pageSize);
        }
      },
      error: (err) => {
        this.deleting.set(false);
        if (err.status === 403) {
          this.errorMessage.set('You do not have permission to delete this category.');
        } else if (err.status === 404) {
          this.errorMessage.set('Category not found. It may have already been deleted.');
          // Remove from local state since it's already gone
          const id = this.categoryToDelete!.id;
          this.categories.set(this.categories().filter(c => c.id !== id));
          this.filteredCategories = this.filteredCategories.filter(c => c.id !== id);
          this.closeDeleteModal();
        } else {
          this.errorMessage.set('Failed to delete category. Please try again later.');
        }
      }
    });
  }

  // Pagination controls
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.loadCategories(page, this.pageSize);
    }
  }

  private closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.categoryToDelete = null;
    this.deleting.set(false);
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }
}